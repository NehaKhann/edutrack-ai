package com.edutrack.syllabus.service;

import com.edutrack.common.ApiException;
import net.sourceforge.tess4j.ITessAPI;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import net.sourceforge.tess4j.Word;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.poi.hwpf.HWPFDocument;
import org.apache.poi.hwpf.extractor.WordExtractor;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Component
public class DocumentTextExtractor {

    private static final Logger log = LoggerFactory.getLogger(DocumentTextExtractor.class);

    public static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private static final List<String> IMAGE_TYPES = List.of("image/jpeg", "image/png", "image/webp");

    /** Below this many non-whitespace characters, a "PDF" is almost certainly a scanned image with no real text layer. */
    private static final int MIN_TEXT_LAYER_CHARS = 30;
    private static final int MAX_OCR_PAGES = 15;
    private static final float OCR_RENDER_DPI = 300f;

    /** Tesseract word confidence (0-100) below this is flagged to the teacher as worth double-checking. */
    private static final double LOW_CONFIDENCE_WORD_THRESHOLD = 65.0;
    private static final int MAX_LOW_CONFIDENCE_WORDS = 25;

    /**
     * Running OCR with both languages loaded at once measurably degrades English-only documents (Tesseract
     * occasionally "reads" ambiguous glyphs as stray Urdu script that isn't really there — observed directly
     * on real scanned syllabi, not a hypothetical). So English is tried alone first, and Urdu is only added
     * if that result looks unreliable (too little ASCII text to be a real English page).
     */
    private static final double MIN_LETTER_RATIO_FOR_ENGLISH_ONLY = 0.6;
    private static final double MIN_WORD_RATIO_FOR_ENGLISH_ONLY = 0.5;

    @Value("${ocr.tessdata-path:}")
    private String tessdataPath;

    public record ExtractionResult(
            String text,
            String contentType,
            Double ocrConfidence,
            String ocrLanguage,
            List<String> lowConfidenceWords
    ) {
    }

    private record OcrOutcome(String text, double avgConfidence, List<String> lowConfidenceWords) {
    }

    private record AutoOcrOutcome(String text, double avgConfidence, String language, List<String> lowConfidenceWords) {
    }

    public ExtractionResult extract(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw ApiException.badRequest(
                    "Unsupported file type. Please upload a PDF, Word document (.doc/.docx), or an image (JPG/PNG/WebP).");
        }

        try (InputStream in = file.getInputStream()) {
            if (contentType.equals("application/pdf")) {
                return extractPdf(in, contentType);
            }
            if (contentType.equals("application/vnd.openxmlformats-officedocument.wordprocessingml.document")) {
                return new ExtractionResult(extractDocx(in), contentType, null, null, List.of());
            }
            if (contentType.equals("application/msword")) {
                return new ExtractionResult(extractDoc(in), contentType, null, null, List.of());
            }
            if (IMAGE_TYPES.contains(contentType)) {
                BufferedImage image = ImageIO.read(in);
                if (image == null) {
                    throw ApiException.badRequest("Could not decode the uploaded image.");
                }
                AutoOcrOutcome outcome = ocrImageAuto(image);
                return new ExtractionResult(outcome.text(), contentType, outcome.avgConfidence(), outcome.language(), outcome.lowConfidenceWords());
            }
        } catch (IOException e) {
            throw ApiException.badRequest("Failed to read uploaded file: " + e.getMessage());
        }

        throw ApiException.badRequest("Unsupported file type.");
    }

    private ExtractionResult extractPdf(InputStream in, String contentType) {
        try (PDDocument document = PDDocument.load(in)) {
            String textLayer = PdfTextExtractor.extractFromDocument(document);
            if (textLayer != null && textLayer.replaceAll("\\s+", "").length() >= MIN_TEXT_LAYER_CHARS) {
                return new ExtractionResult(textLayer, contentType, null, null, List.of());
            }

            log.info("PDF has no usable text layer (likely a scan/photo) — falling back to OCR on rendered pages");
            PDFRenderer renderer = new PDFRenderer(document);
            int pageCount = Math.min(document.getNumberOfPages(), MAX_OCR_PAGES);
            StringBuilder combinedText = new StringBuilder();
            List<Double> pageConfidences = new ArrayList<>();
            Set<String> lowConfWords = new LinkedHashSet<>();
            boolean usedUrdu = false;
            for (int i = 0; i < pageCount; i++) {
                BufferedImage pageImage = renderer.renderImageWithDPI(i, OCR_RENDER_DPI, ImageType.RGB);
                AutoOcrOutcome outcome = ocrImageAuto(pageImage);
                combinedText.append(outcome.text()).append("\n\n");
                pageConfidences.add(outcome.avgConfidence());
                lowConfWords.addAll(outcome.lowConfidenceWords());
                if (outcome.language().contains("urd")) usedUrdu = true;
            }
            double avgConfidence = pageConfidences.stream().mapToDouble(Double::doubleValue).average().orElse(0);
            List<String> cappedLowConf = lowConfWords.stream().limit(MAX_LOW_CONFIDENCE_WORDS).toList();
            return new ExtractionResult(combinedText.toString(), contentType, avgConfidence, usedUrdu ? "eng+urd" : "eng", cappedLowConf);
        } catch (IOException e) {
            throw ApiException.badRequest("Could not read the uploaded file as a PDF: " + e.getMessage());
        }
    }

    private String extractDocx(InputStream in) {
        try (XWPFDocument doc = new XWPFDocument(in); XWPFWordExtractor extractor = new XWPFWordExtractor(doc)) {
            return extractor.getText();
        } catch (IOException e) {
            throw ApiException.badRequest("Could not read the uploaded .docx file: " + e.getMessage());
        }
    }

    private String extractDoc(InputStream in) {
        try (HWPFDocument doc = new HWPFDocument(in); WordExtractor extractor = new WordExtractor(doc)) {
            return extractor.getText();
        } catch (IOException e) {
            throw ApiException.badRequest("Could not read the uploaded .doc file: " + e.getMessage());
        }
    }

    private AutoOcrOutcome ocrImageAuto(BufferedImage image) {
        OcrOutcome englishOnly = ocrImage(image, "eng");
        if (looksLikeRealEnglish(englishOnly.text())) {
            return new AutoOcrOutcome(englishOnly.text(), englishOnly.avgConfidence(), "eng", englishOnly.lowConfidenceWords());
        }
        log.info("English-only OCR looked unreliable (not enough recognizable English text) — retrying with eng+urd");
        OcrOutcome combined = ocrImage(image, "eng+urd");
        return new AutoOcrOutcome(combined.text(), combined.avgConfidence(), "eng+urd", combined.lowConfidenceWords());
    }

    /**
     * Forcing English-only OCR on a non-Latin-script page doesn't fail loudly — it produces confident-looking
     * ASCII noise (stray punctuation/symbols/digits, as observed directly on a real Urdu scan), which a plain
     * ASCII-byte-ratio check can't tell apart from real prose. Real English text is mostly actual letters with
     * word-length gaps between spaces; OCR noise from the wrong script is mostly symbols/digits/single chars.
     */
    private boolean looksLikeRealEnglish(String text) {
        String nonSpace = text.replaceAll("\\s+", "");
        if (nonSpace.length() < MIN_TEXT_LAYER_CHARS) return false;

        long letters = nonSpace.chars().filter(c -> (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')).count();
        double letterRatio = (double) letters / nonSpace.length();

        String[] words = text.trim().split("\\s+");
        long realLookingWords = 0;
        for (String word : words) {
            String letterOnly = word.replaceAll("[^a-zA-Z]", "");
            if (letterOnly.length() >= 2 && (double) letterOnly.length() / word.length() >= 0.7) {
                realLookingWords++;
            }
        }
        double wordRatio = words.length == 0 ? 0 : (double) realLookingWords / words.length;

        return letterRatio >= MIN_LETTER_RATIO_FOR_ENGLISH_ONLY && wordRatio >= MIN_WORD_RATIO_FOR_ENGLISH_ONLY;
    }

    private OcrOutcome ocrImage(BufferedImage image, String language) {
        try {
            Tesseract tesseract = new Tesseract();
            tesseract.setLanguage(language);
            if (tessdataPath != null && !tessdataPath.isBlank()) {
                tesseract.setDatapath(tessdataPath);
            }
            String text = tesseract.doOCR(image);

            List<Word> words = tesseract.getWords(image, ITessAPI.TessPageIteratorLevel.RIL_WORD);
            double avgConfidence = words.isEmpty() ? 0 : words.stream().mapToDouble(Word::getConfidence).average().orElse(0);
            List<String> lowConfidenceWords = words.stream()
                    .filter(w -> w.getConfidence() < LOW_CONFIDENCE_WORD_THRESHOLD && !w.getText().isBlank())
                    .map(Word::getText)
                    .distinct()
                    .limit(MAX_LOW_CONFIDENCE_WORDS)
                    .toList();

            return new OcrOutcome(text, avgConfidence, lowConfidenceWords);
        } catch (TesseractException e) {
            throw ApiException.internal("OCR failed on the uploaded document: " + e.getMessage());
        }
    }
}
