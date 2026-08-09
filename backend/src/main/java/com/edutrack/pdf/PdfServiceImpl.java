package com.edutrack.pdf;

import com.edutrack.common.ApiException;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.io.ByteArrayOutputStream;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PdfServiceImpl implements PdfService {

    private final TemplateEngine templateEngine;

    @Override
    public byte[] render(String templateName, Map<String, Object> model) {
        Context context = new Context();
        context.setVariables(model);
        String html = templateEngine.process("pdf/" + templateName, context);

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.withHtmlContent(html, "classpath:/templates/pdf/");
            builder.toStream(out);
            builder.run();
            return out.toByteArray();
        } catch (Exception ex) {
            throw ApiException.internal("Failed to generate PDF (" + templateName + "): " + ex.getMessage());
        }
    }
}
