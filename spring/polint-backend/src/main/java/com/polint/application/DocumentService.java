package com.polint.application;

import com.polint.api.dto.AgentExtractResponse;
import com.polint.api.dto.AgentExtractUrlRequest;
import com.polint.api.dto.ExtractTextResponse;
import com.polint.api.dto.ExtractUrlRequest;
import com.polint.common.exception.ApiException;
import com.polint.common.exception.ErrorCode;
import com.polint.infra.agent.AgentClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private final AgentClient agentClient;

    public ExtractTextResponse extractFromFile(MultipartFile file) {
        try {
            if (file == null || file.isEmpty()) {
                throw new ApiException(ErrorCode.BAD_REQUEST, "file is empty");
            }

            AgentExtractResponse r = agentClient.extractFile(
                    file.getOriginalFilename(),
                    file.getBytes(),
                    file.getContentType()
            );

            return new ExtractTextResponse(
                    r.title(),
                    r.text(),
                    "file",
                    r.mimeType()
            );
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "extract failed: " + e.getMessage());
        }
    }

    public ExtractTextResponse extractFromUrl(ExtractUrlRequest req) {
        AgentExtractResponse r = agentClient.extractUrl(new AgentExtractUrlRequest(req.url()));
        return new ExtractTextResponse(
                r.title(),
                r.text(),
                "url",
                r.mimeType()
        );
    }
}
