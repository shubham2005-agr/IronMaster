package com.ragnarok.config;

import org.mariadb.jdbc.Driver;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.vectorstore.mariadb.MariaDBVectorStore;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SimpleDriverDataSource;

import javax.sql.DataSource;

@Configuration
public class MariaDbVectorStoreConfig {

    @Value("${spring.vector.datasource.url}")
    private String vectorDbUrl;

    @Value("${spring.vector.datasource.username}")
    private String vectorDbUser;

    @Value("${spring.vector.datasource.password}")
    private String vectorDbPass;

    @Bean(name = "vectorDataSource")
    public DataSource vectorDataSource() {
        SimpleDriverDataSource dataSource = new SimpleDriverDataSource();
        dataSource.setDriverClass(Driver.class);
        dataSource.setUrl(vectorDbUrl);
        dataSource.setUsername(vectorDbUser);
        dataSource.setPassword(vectorDbPass);
        return dataSource;
    }

    @Bean(name = "vectorJdbcTemplate")
    public JdbcTemplate vectorJdbcTemplate(@Qualifier("vectorDataSource") DataSource vectorDataSource) {
        return new JdbcTemplate(vectorDataSource);
    }

    @Bean
    public MariaDBVectorStore vectorStore(
            @Qualifier("vectorJdbcTemplate") JdbcTemplate vectorJdbcTemplate,
            EmbeddingModel embeddingModel) {
        return MariaDBVectorStore.builder(vectorJdbcTemplate, embeddingModel)
                .dimensions(768)
                .distanceType(MariaDBVectorStore.MariaDBDistanceType.COSINE)
                .initializeSchema(true)
                .schemaValidation(false)
                .build();
    }
}
