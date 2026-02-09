package com.polint.infra.agent;

import com.polint.api.dto.AgentBuildRequest;
import com.polint.api.dto.AgentBuildResponse;
import com.polint.api.dto.AgentLintRequest;
import com.polint.api.dto.AgentLintResponse;
import com.polint.api.dto.AgentNormalizeRequest;
import com.polint.api.dto.AgentNormalizeResponse;
import com.polint.api.dto.AgentExtractResponse;
import com.polint.api.dto.AgentExtractUrlRequest;

import com.polint.common.exception.ApiException;
import com.polint.common.exception.ErrorCode;

import com.polint.config.PolintAgentProperties;

import lombok.RequiredArgsConstructor;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

import com.polint.api.dto.AgentNormalizeRequest;
import com.polint.api.dto.AgentNormalizeResponse;

import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.web.reactive.function.BodyInserters;

import java.time.Duration;

@Component
@RequiredArgsConstructor
public class HttpAgentClient implements AgentClient {

    private final PolintAgentProperties props;

    private WebClient client() {
        return WebClient.builder()
                .baseUrl(props.getBaseUrl())
                .build();
    }

    @Override
    public AgentBuildResponse build(AgentBuildRequest req) {
        try {
            return client().post()
                    .uri("/v1/agent/build")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(req)
                    .retrieve()
                    .bodyToMono(AgentBuildResponse.class)
                    .timeout(Duration.ofMillis(props.getTimeoutMs()))
                    .block();
        } catch (WebClientResponseException e) {
            throw new ApiException(ErrorCode.UPSTREAM_ERROR, "agent build failed: " + e.getResponseBodyAsString());
        } catch (Exception e) {
            throw new ApiException(ErrorCode.UPSTREAM_ERROR, "agent build failed: " + e.getMessage());
        }
    }

    @Override
    public AgentLintResponse lint(AgentLintRequest req) {
        try {
            return client().post()
                    .uri("/v1/agent/lint")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(req)
                    .retrieve()
                    .bodyToMono(AgentLintResponse.class)
                    .timeout(Duration.ofMillis(props.getTimeoutMs()))
                    .block();
        } catch (WebClientResponseException e) {
            throw new ApiException(ErrorCode.UPSTREAM_ERROR, "agent lint failed: " + e.getResponseBodyAsString());
        } catch (Exception e) {
            throw new ApiException(ErrorCode.UPSTREAM_ERROR, "agent lint failed: " + e.getMessage());
        }
    }
    @Override
    public AgentNormalizeResponse normalize(AgentNormalizeRequest req) {
        try {
            return client().post()
                    .uri("/v1/agent/normalize")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(req)
                    .retrieve()
                    .bodyToMono(AgentNormalizeResponse.class)
                    .timeout(Duration.ofMillis(props.getTimeoutMs()))
                    .block();
        } catch (WebClientResponseException e) {
            throw new ApiException(ErrorCode.UPSTREAM_ERROR, "agent normalize failed: " + e.getResponseBodyAsString());
        } catch (Exception e) {
            throw new ApiException(ErrorCode.UPSTREAM_ERROR, "agent normalize failed: " + e.getMessage());
        }
    }
    
    @Override
    public AgentExtractResponse extractFile(String filename, byte[] bytes, String contentType) {
        try {
            MultipartBodyBuilder builder = new MultipartBodyBuilder();

            ByteArrayResource resource = new ByteArrayResource(bytes) {
                @Override
                public String getFilename() {
                    return (filename == null || filename.isBlank()) ? "upload" : filename;
                }
            };

            if (contentType != null && !contentType.isBlank()) {
                builder.part("file", resource).contentType(MediaType.parseMediaType(contentType));
            } else {
                builder.part("file", resource);
            }

            return client().post()
                    .uri("/v1/agent/extract/file")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(AgentExtractResponse.class)
                    .timeout(Duration.ofMillis(props.getTimeoutMs()))
                    .block();

        } catch (WebClientResponseException e) {
            throw new ApiException(ErrorCode.UPSTREAM_ERROR, "agent extract(file) failed: " + e.getResponseBodyAsString());
        } catch (Exception e) {
            throw new ApiException(ErrorCode.UPSTREAM_ERROR, "agent extract(file) failed: " + e.getMessage());
        }
    }

    @Override
    public AgentExtractResponse extractUrl(AgentExtractUrlRequest req) {
        try {
            return client().post()
                    .uri("/v1/agent/extract/url")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(req)
                    .retrieve()
                    .bodyToMono(AgentExtractResponse.class)
                    .timeout(Duration.ofMillis(props.getTimeoutMs()))
                    .block();
        } catch (WebClientResponseException e) {
            throw new ApiException(ErrorCode.UPSTREAM_ERROR, "agent extract(url) failed: " + e.getResponseBodyAsString());
        } catch (Exception e) {
            throw new ApiException(ErrorCode.UPSTREAM_ERROR, "agent extract(url) failed: " + e.getMessage());
        }
    }
}


