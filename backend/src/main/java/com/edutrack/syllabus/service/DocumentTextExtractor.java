package com.edutrack.syllabus.service;

import com.edutrack.common.ApiException;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
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

    public String extract(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw ApiException.badRequest(
                    "Unsupported file type. Please upload a PDF, Word document (.doc/.docx), or an image (JPG/PNG/WebP).");
        }

        try (InputStream in = file.getInputStream()) {
            if (contentType.equals("application/pdf")) {
                return extractPdf(in);
            }
            if (contentType.equals("application/vnd.openxmlformats-officedocument.wordprocessingml.document")) {
                return extractDocx(in);
            }
            if (contentType.equals("application/msword")) {
                return extractDoc(in);
            }
            if (IMAGE_TYPES.contains(contentType)) {
                BufferedImage image = ImageIO.read(in);
                if (image == null) {
                    throw ApiException.badRequest("Could not decode the uploaded image.");
                }
                return ocrImageAuto(image);
            }
        } catch (IOException e) {
            throw ApiException.badRequest("Failed to read uploaded file: " + e.getMessage());
        }

        throw ApiException.badRequest("Unsupported file type.");
    }

    private String extractPdf(InputStream in) {
        try (PDDocument document = PDDocument.load(in)) {
            String textLayer = PdfTextExtractor.extractFromDocument(document);
            if (textLayer != null && textLayer.replaceAll("\\s+", "").length() >= MIN_TEXT_LAYER_CHARS) {
                return textLayer;
            }

            log.info("PDF has no usable text layer (likely a scan/photo) — falling back to OCR on rendered pages");
            PDFRenderer renderer = new PDFRenderer(document);
            int pageCount = Math.min(document.getNumberOfPages(), MAX_OCR_PAGES);
            StringBuilder combined = new StringBuilder();
            for (int i = 0; i < pageCount; i++) {
                BufferedImage pageImage = renderer.renderImageWithDPI(i, OCR_RENDER_DPI, ImageType.RGB);
                combined.append(ocrImageAuto(pageImage)).append("\n\n");
            }
            return combined.toString();
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

    private String ocrImageAuto(BufferedImage image) {
        String englishOnly = ocrImage(image, "eng");
        if (looksLikeRealEnglish(englishOnly)) {
            return englishOnly;
        }
        log.info("English-only OCR looked unreliable (not enough recognizable English text) — retrying with eng+urd");
        return ocrImage(image, "eng+urd");
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

    private String ocrImage(BufferedImage image, String language) {
        try {
            Tesseract tesseract = new Tesseract();
            tesseract.setLanguage(language);
            if (tessdataPath != null && !tessdataPath.isBlank()) {
                tesseract.setDatapath(tessdataPath);
            }
            return tesseract.doOCR(image);
        } catch (TesseractException e) {
            throw ApiException.internal("OCR failed on the uploaded document: " + e.getMessage());
        }
    }
}
