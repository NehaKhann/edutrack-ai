package com.edutrack.syllabus.service;

import com.edutrack.common.ApiException;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.apache.poi.hwpf.HWPFDocument;
import org.apache.poi.hwpf.extractor.WordExtractor;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
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

    public static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private static final List<String> IMAGE_TYPES = List.of("image/jpeg", "image/png", "image/webp");

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
                return PdfTextExtractor.extract(in);
            }
            if (contentType.equals("application/vnd.openxmlformats-officedocument.wordprocessingml.document")) {
                return extractDocx(in);
            }
            if (contentType.equals("application/msword")) {
                return extractDoc(in);
            }
            if (IMAGE_TYPES.contains(contentType)) {
                return extractImage(in);
            }
        } catch (IOException e) {
            throw ApiException.badRequest("Failed to read uploaded file: " + e.getMessage());
        }

        throw ApiException.badRequest("Unsupported file type.");
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

    private String extractImage(InputStream in) {
        try {
            BufferedImage image = ImageIO.read(in);
            if (image == null) {
                throw ApiException.badRequest("Could not decode the uploaded image.");
            }
            Tesseract tesseract = new Tesseract();
            tesseract.setLanguage("eng");
            if (tessdataPath != null && !tessdataPath.isBlank()) {
                tesseract.setDatapath(tessdataPath);
            }
            return tesseract.doOCR(image);
        } catch (IOException e) {
            throw ApiException.badRequest("Could not read the uploaded image: " + e.getMessage());
        } catch (TesseractException e) {
            throw ApiException.internal("OCR failed on the uploaded image: " + e.getMessage());
        }
    }
}
