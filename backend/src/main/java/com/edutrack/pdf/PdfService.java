package com.edutrack.pdf;

import java.util.Map;

public interface PdfService {

    /**
     * Renders the given Thymeleaf template (path relative to templates/pdf/, no .html suffix)
     * with the supplied model into PDF bytes.
     */
    byte[] render(String templateName, Map<String, Object> model);
}
