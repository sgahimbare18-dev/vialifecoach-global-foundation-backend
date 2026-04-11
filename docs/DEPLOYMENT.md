# Deployment Guide

This guide covers various deployment options for the Vialifecoach Backend API.

## Prerequisites

- Node.js 16.0 or higher
- MongoDB 4.4 or higher
- Domain name (for production)
- SSL certificate (for production)
- Email service credentials

## Environment Configuration

### Development Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env file
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/vialifecoach
JWT_SECRET=your_dev_secret_key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### Production Environment
```bash
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://your-production-db-url
JWT_SECRET=your_super_secure_production_secret
EMAIL_HOST=your-production-email-host
EMAIL_PORT=587
EMAIL_USER=your_production_email
EMAIL_PASS=your_production_email_password
FRONTEND_URL=https://your-domain.com
```

## Deployment Options

### 1. Traditional Server Deployment

#### Setup on Ubuntu/Debian

1. **Install Node.js**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. **Install MongoDB**
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
```

3. **Setup Application**
```bash
# Clone repository
git clone <repository-url>
cd vialifecoach-backend

# Install dependencies
npm ci --production

# Create uploads directory
mkdir uploads

# Set permissions
chmod 755 uploads
```

4. **Setup PM2 (Process Manager)**
```bash
# Install PM2 globally
sudo npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'vialifecoach-backend',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Create logs directory
mkdir logs

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

### 2. Docker Deployment

#### Dockerfile
```dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start application
CMD ["npm", "start"]
```

#### Docker Compose
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/vialifecoach
    depends_on:
      - mongo
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped

  mongo:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  mongo_data:
```

#### Build and Run
```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 3. Cloud Deployment

#### AWS EC2

1. **Launch EC2 Instance**
   - Choose Ubuntu 20.04 LTS
   - Select instance type (t2.micro for testing, t3.medium for production)
   - Configure security group (ports 80, 443, 22)

2. **Setup Application**
   ```bash
   # SSH into instance
   ssh -i your-key.pem ubuntu@your-ec2-ip

   # Follow traditional server setup steps
   ```

3. **Configure Domain and SSL**
   ```bash
   # Install certbot for SSL
   sudo apt-get install certbot python3-certbot-nginx

   # Get SSL certificate
   sudo certbot --nginx -d your-domain.com
   ```

#### Heroku

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   ```

2. **Create Heroku App**
   ```bash
   heroku create your-app-name
   ```

3. **Configure Environment Variables**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set MONGODB_URI=your-mongodb-uri
   heroku config:set JWT_SECRET=your-jwt-secret
   heroku config:set EMAIL_USER=your-email
   heroku config:set EMAIL_PASS=your-password
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

#### DigitalOcean App Platform

1. **Create App**
   - Go to DigitalOcean App Platform
   - Click "Create App"
   - Connect your GitHub repository

2. **Configure Build Settings**
   ```yaml
   # .do/app.yaml
   name: vialifecoach-backend
   services:
   - name: web
     source_dir: /
     github:
       repo: your-username/vialifecoach-backend
       branch: main
     run_command: npm start
     environment_slug: node-js
     instance_count: 1
     instance_size_slug: basic-xxs
     env:
     - key: NODE_ENV
       value: production
     - key: MONGODB_URI
       value: ${database.DATABASE_URL}
   databases:
   - name: db
       engine: MONGODB
       version: "6"
   ```

## Nginx Configuration

### Basic Nginx Config
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads/ {
        alias /path/to/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Database Setup

### MongoDB Atlas (Cloud)

1. **Create Cluster**
   - Go to MongoDB Atlas
   - Create new cluster
   - Choose cloud provider and region

2. **Configure Network Access**
   - Add your server IP to whitelist
   - Enable VPC peering if needed

3. **Create Database User**
   - Create new user with strong password
   - Assign appropriate permissions

4. **Get Connection String**
   ```
   mongodb+srv://username:password@cluster.mongodb.net/vialifecoach?retryWrites=true&w=majority
   ```

### Self-hosted MongoDB

```bash
# Install MongoDB
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Create database and user
mongo
> use vialifecoach
> db.createUser({
    user: "vialifecoach_user",
    pwd: "strong_password",
    roles: [{ role: "readWrite", db: "vialifecoach" }]
  })
> exit
```

## Monitoring and Logging

### Application Monitoring

1. **PM2 Monitoring**
   ```bash
   # Monitor application
   pm2 monit

   # View logs
   pm2 logs

   # Restart application
   pm2 restart vialifecoach-backend
   ```

2. **Log Management**
   ```bash
   # Setup log rotation
   sudo nano /etc/logrotate.d/vialifecoach-backend

   # Content:
   /path/to/vialifecoach-backend/logs/*.log {
       daily
       missingok
       rotate 52
       compress
       delaycompress
       notifempty
       create 644 www-data www-data
       postrotate
           pm2 reloadLogs
       endscript
   }
   ```

### Health Check

Create `healthcheck.js`:
```javascript
const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 5000,
  path: '/api/health',
  method: 'GET',
  timeout: 3000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

req.on('error', () => {
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy();
  process.exit(1);
});

req.end();
```

## Backup Strategy

### Database Backup

```bash
# Create backup script
cat > backup.sh << EOF
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"
DB_NAME="vialifecoach"

mkdir -p $BACKUP_DIR

mongodump --db $DB_NAME --out $BACKUP_DIR/backup_$DATE

# Keep only last 7 days of backups
find $BACKUP_DIR -type d -name "backup_*" -mtime +7 -exec rm -rf {} \;
EOF

chmod +x backup.sh

# Schedule daily backup
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

### File Backup

```bash
# Backup uploaded files
rsync -av /path/to/uploads/ /backups/uploads/$(date +%Y%m%d)/
```

## Security Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use strong secrets
   - Rotate keys regularly

2. **Firewall Configuration**
   ```bash
   # Configure UFW
   sudo ufw enable
   sudo ufw allow ssh
   sudo ufw allow 80
   sudo ufw allow 443
   ```

3. **Regular Updates**
   ```bash
   # Update system packages
   sudo apt update && sudo apt upgrade

   # Update Node.js dependencies
   npm audit fix
   ```

4. **SSL Certificate**
   - Use Let's Encrypt for free SSL
   - Set up auto-renewal
   - Monitor certificate expiry

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check MongoDB service status
   - Verify connection string
   - Check network connectivity

2. **Email Service Not Working**
   - Verify SMTP credentials
   - Check firewall ports
   - Review email provider settings

3. **File Upload Issues**
   - Check directory permissions
   - Verify disk space
   - Review file size limits

### Log Analysis

```bash
# View application logs
tail -f logs/out.log

# View error logs
tail -f logs/err.log

# Search for specific errors
grep "ERROR" logs/combined.log
```

## Performance Optimization

1. **Database Optimization**
   - Create appropriate indexes
   - Monitor query performance
   - Use connection pooling

2. **Application Optimization**
   - Enable compression
   - Implement caching
   - Use CDN for static files

3. **Server Optimization**
   - Configure Nginx caching
   - Enable HTTP/2
   - Optimize SSL configuration
