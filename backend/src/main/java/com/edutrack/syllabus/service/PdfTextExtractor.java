package com.edutrack.syllabus.service;

import com.edutrack.common.ApiException;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;

import java.io.IOException;
import java.io.InputStream;

public final class PdfTextExtractor {

    private PdfTextExtractor() {
    }

    public static String extract(InputStream inputStream) {
        try (PDDocument document = PDDocument.load(inputStream)) {
            return new PDFTextStripper().getText(document);
        } catch (IOException e) {
            throw ApiException.badRequest("Could not read the uploaded file as a PDF: " + e.getMessage());
        }
    }
}
