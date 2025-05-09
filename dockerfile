FROM node:18 
WORKDIR /app 
COPY . /app 
RUN npm install 
RUN npm run build-dev 
EXPOSE 5000 
CMD  ["npm", "start"]