FROM node:18-alpine

RUN apk add --no-cache unzip ca-certificates curl

WORKDIR /app

ADD https://github.com/pocketbase/pocketbase/releases/download/v0.23.12/pocketbase_0.23.12_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /app/ && rm /tmp/pb.zip

COPY package*.json ./
COPY seed.js ./
COPY pb_migrations ./pb_migrations/

RUN npm install

EXPOSE 8090

VOLUME /app/pb_data

CMD ["./pocketbase", "serve", "--http=0.0.0.0:8090"]