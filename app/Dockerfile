FROM node:20-alpine AS base

WORKDIR /usr/src/app

COPY package.json ./

RUN npm install --only=production

COPY src ./src

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]

