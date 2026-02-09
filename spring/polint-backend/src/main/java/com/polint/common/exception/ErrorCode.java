package com.polint.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    NOT_FOUND(HttpStatus.NOT_FOUND, "NOT_FOUND"),
    BAD_REQUEST(HttpStatus.BAD_REQUEST, "BAD_REQUEST"),
    UPSTREAM_ERROR(HttpStatus.BAD_GATEWAY, "UPSTREAM_ERROR"),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR");

    private final HttpStatus status;
    private final String code;

    ErrorCode(HttpStatus status, String code) {
        this.status = status;
        this.code = code;
    }
}
