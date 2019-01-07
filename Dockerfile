FROM node:8-alpine

WORKDIR /usr/src/app

COPY . .

RUN npm install -g

WORKDIR /usr/src/app/files

ENTRYPOINT ["/usr/local/bin/markdownlint"]
