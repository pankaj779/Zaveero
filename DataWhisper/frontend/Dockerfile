FROM node:20-alpine
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

ENV NODE_ENV=production
# Server-side Route Handlers / next-auth must call the API by Docker service name (not localhost).
ENV INTERNAL_API_URL=http://backend:8000
EXPOSE 3000
CMD ["npm", "run", "start"]
