FROM node:16-alpine

WORKDIR /app

COPY . .

RUN npm install --production

RUN npm install --global

WORKDIR /workdir

ENTRYPOINT ["/usr/local/bin/markdownlint"]
