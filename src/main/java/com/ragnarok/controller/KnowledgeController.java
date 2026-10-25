package com.ragnarok.controller;

import com.ragnarok.service.KnowledgeIngestionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/knowledge")
public class KnowledgeController {

    private final KnowledgeIngestionService ingestionService;

    public KnowledgeController(KnowledgeIngestionService ingestionService) {
        this.ingestionService = ingestionService;
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "category", defaultValue = "general") String category) throws IOException {
        int chunkCount = ingestionService.ingestFile(file, category);
        return ResponseEntity.ok(Map.of(
                "fileName", file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown",
                "indexedChunks", chunkCount,
                "status", "Indexed in MariaDB Vector Store"
        ));
    }
}
