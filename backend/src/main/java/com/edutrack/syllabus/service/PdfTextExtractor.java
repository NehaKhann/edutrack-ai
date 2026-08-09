package com.edutrack.syllabus.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;

import java.io.IOException;

public final class PdfTextExtractor {

    private PdfTextExtractor() {
    }

    public static String extractFromDocument(PDDocument document) throws IOException {
        return new PDFTextStripper().getText(document);
    }
}
