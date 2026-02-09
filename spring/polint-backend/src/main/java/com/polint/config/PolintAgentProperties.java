package com.polint.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "polint.agent")
public class PolintAgentProperties {
    private String baseUrl;
    private long timeoutMs = 120_000;
}
