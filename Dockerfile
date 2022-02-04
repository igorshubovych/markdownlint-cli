FROM node:lts-alpine

WORKDIR /usr/src/app

COPY . .

RUN npm install --global --production

WORKDIR /usr/src/app/files

ENTRYPOINT ["/usr/local/bin/markdownlint"]
