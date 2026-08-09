FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN apk add --no-cache tesseract-ocr tesseract-ocr-data-eng
COPY --from=build /app/target/backend-0.1.0.jar app.jar
RUN mkdir -p /app/storage
ENV OCR_TESSDATA_PATH=/usr/share/tessdata
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
