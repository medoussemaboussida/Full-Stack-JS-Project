FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build-dev

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app .
RUN npm install --omit=dev
EXPOSE 5000
CMD ["npm", "start"]
