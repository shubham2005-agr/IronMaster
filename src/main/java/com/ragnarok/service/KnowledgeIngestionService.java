package com.ragnarok.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class KnowledgeIngestionService {

    private final VectorStore vectorStore;

    public KnowledgeIngestionService(VectorStore vectorStore) {
        this.vectorStore = vectorStore;
    }

    public int ingestFile(MultipartFile file, String sourceCategory) throws IOException {
        String filename = Optional.ofNullable(file.getOriginalFilename()).orElse("unknown.txt");
        String text;

        if (filename.toLowerCase().endsWith(".pdf")) {
            try (PDDocument doc = Loader.loadPDF(file.getBytes())) {
                PDFTextStripper stripper = new PDFTextStripper();
                text = stripper.getText(doc);
            }
        } else {
            text = new String(file.getBytes(), StandardCharsets.UTF_8);
        }

        List<Document> chunks = chunkText(text, filename, sourceCategory);
        if (!chunks.isEmpty()) {
            vectorStore.add(chunks);
        }
        return chunks.size();
    }

    private List<Document> chunkText(String fullText, String filename, String sourceCategory) {
        List<Document> documents = new ArrayList<>();
        if (fullText == null || fullText.isBlank()) {
            return documents;
        }

        String[] rawBlocks = fullText.split("\\n\\s*\\n");
        int chunkCounter = 0;

        for (String block : rawBlocks) {
            String clean = block.trim();
            if (clean.length() < 20) continue;

            // If a block is large, break it into smaller sub-chunks
            if (clean.length() > 800) {
                int start = 0;
                while (start < clean.length()) {
                    int end = Math.min(start + 800, clean.length());
                    String sub = clean.substring(start, end).trim();
                    if (sub.length() >= 20) {
                        documents.add(new Document(
                                sub,
                                Map.of(
                                        "source", filename,
                                        "category", sourceCategory != null ? sourceCategory : "general",
                                        "type", "knowledge_doc",
                                        "chunkIndex", chunkCounter++
                                )
                        ));
                    }
                    if (end == clean.length()) break;
                    start += 700; // 100 character overlap
                }
            } else {
                documents.add(new Document(
                        clean,
                        Map.of(
                                "source", filename,
                                "category", sourceCategory != null ? sourceCategory : "general",
                                "type", "knowledge_doc",
                                "chunkIndex", chunkCounter++
                        )
                ));
            }
        }

        if (documents.isEmpty() && !fullText.trim().isEmpty()) {
            documents.add(new Document(
                    fullText.trim(),
                    Map.of(
                            "source", filename,
                            "category", sourceCategory != null ? sourceCategory : "general",
                            "type", "knowledge_doc",
                            "chunkIndex", 0
                    )
            ));
        }

        return documents;
    }
}
