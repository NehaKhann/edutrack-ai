FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
# The school (and every date/time-of-day comparison in this app — attendance cutoffs, "today", etc.)
# operates in Pakistan time, not the container's default UTC clock. tzdata is needed for Alpine to
# resolve the IANA zone name at all.
RUN apk add --no-cache tzdata
ENV TZ=Asia/Karachi
RUN apk add --no-cache tesseract-ocr tesseract-ocr-data-eng
# Alpine's package repo has no Urdu language pack; fetch it directly from the official release. Urdu OCR is
# hard enough on real scans that the "best" (slower, most accurate) model is worth it over "fast" here.
RUN apk add --no-cache --virtual .fetch-deps curl \
    && curl -fL -o /usr/share/tessdata/urd.traineddata \
       https://github.com/tesseract-ocr/tessdata_best/raw/main/urd.traineddata \
    && apk del .fetch-deps
COPY --from=build /app/target/backend-0.1.0.jar app.jar
RUN mkdir -p /app/storage
ENV OCR_TESSDATA_PATH=/usr/share/tessdata
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
