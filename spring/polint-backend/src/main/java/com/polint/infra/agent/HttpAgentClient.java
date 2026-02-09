package com.polint.infra.agent;

import com.polint.api.dto.AgentBuildRequest;
import com.polint.api.dto.AgentBuildResponse;
import com.polint.api.dto.AgentLintRequest;
import com.polint.api.dto.AgentLintResponse;
import com.polint.api.dto.AgentNormalizeRequest;
import com.polint.api.dto.AgentNormalizeResponse;
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
    
}
