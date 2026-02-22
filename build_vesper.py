import os
import subprocess
import time
import sys
import platform

def print_step(message):
    print(f"\n[\033[1;32m+\033[0m] {message}")

def print_warning(message):
    print(f"\n[\033[1;33m!\033[0m] {message}")

def run_command(command, ignore_errors=False):
    try:
        subprocess.run(command, shell=True, check=True)
    except subprocess.CalledProcessError as e:
        if not ignore_errors:
            print(f"\n[\033[1;31m!\033[0m] Error executing command: {command}")
            print(f"Details: {e}")
            sys.exit(1)

def ask_db_mode():
    print("\n[\033[1;36m?\033[0m] Jak chcesz zainstalować bazę PostgreSQL?")
    print("  1) Lokalnie na hoscie (wymaga uprawnień root/sudo, używa apt i systemctl)")
    print("  2) W kontenerze Docker (zalecane, izolowane środowisko)")
    while True:
        choice = input("Wybierz opcję [1/2]: ").strip()
        if choice in ['1', '2']:
            return choice

def setup_database_local():
    """Twój oryginalny kod do instalacji bazy na hoście."""
    print_step("Checking PostgreSQL database status (Local Host)...")
    
    check_cmd = "systemctl is-active postgresql"
    try:
        status = subprocess.run(check_cmd, shell=True, capture_output=True, text=True).stdout.strip()
    except Exception:
        status = "unknown"

    if status != "active":
        print_warning("PostgreSQL is not running or not installed.")
        print("    Attempting to install and start PostgreSQL automatically...")
        run_command("sudo apt update && sudo apt install postgresql postgresql-contrib -y")
        run_command("sudo systemctl enable postgresql")
        run_command("sudo systemctl start postgresql")
        print_step("PostgreSQL installed and started successfully.")
    else:
        print_step("PostgreSQL is already running.")

    print_step("Provisioning V.E.S.P.E.R. database and user...")
    db_setup_cmds = [
        "sudo -u postgres psql -c \"CREATE USER user_user WITH PASSWORD 'super_secret';\"",
        "sudo -u postgres psql -c \"CREATE DATABASE vesper_db OWNER user_user;\"",
        "sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE vesper_db TO user_user;\""
    ]
    for cmd in db_setup_cmds:
        run_command(cmd, ignore_errors=True)
    
    print_step("Database environment is ready.")

def setup_database_docker():
    """Nowa funkcja do instalacji bazy w kontenerze Docker."""
    print_step("Checking Docker installation...")
    try:
        subprocess.run("docker -v", shell=True, check=True, stdout=subprocess.DEVNULL)
        print_step("Docker is installed.")
    except subprocess.CalledProcessError:
        print_warning("Docker is not installed. Attempting to install...")
        run_command("sudo apt update && sudo apt install docker.io -y")
        run_command("sudo systemctl enable docker")
        run_command("sudo systemctl start docker")

    print_step("Provisioning PostgreSQL container...")
    run_command("docker rm -f vesper-db", ignore_errors=True)
    run_command("docker run --name vesper-db -e POSTGRES_USER=user_user -e POSTGRES_PASSWORD=super_secret -e POSTGRES_DB=vesper_db -p 5432:5432 -d postgres:15-alpine")
    print_step("Docker database container started. Waiting for initialization...")
    time.sleep(5)

def install_puppeteer_deps():
    """Nowa funkcja instalująca zależności przeglądarki Chromium."""
    if platform.system() == "Linux":
        print_step("Installing system dependencies for Puppeteer (Chromium Headless)...")
        deps = "libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 libcairo2 libpango-1.0-0"
        run_command(f"sudo apt update && sudo apt install -y {deps}", ignore_errors=True)

def setup_production():
    """Nowa funkcja budująca wersję prod i podnosząca PM2."""
    print_step("Compiling Next.js project for production...")
    run_command("npm run build")
    
    print_step("Starting V.E.S.P.E.R. with PM2...")
    run_command("sudo npm install -g pm2", ignore_errors=True)
    run_command("pm2 delete vesper", ignore_errors=True)
    run_command("pm2 start npm --name 'vesper' -- run start")
    run_command("pm2 save", ignore_errors=True)

def main():
    print("""\033[1;32m
    __    __  ___   ___   ___   ___   ___ 
    \ \  / / | __| / __| | _ \ | __| | _ \\
     \ \/ /  | _|  \__ \ |  _/ | _|  |   /
      \__/   |___| |___/ |_|   |___| |_|_\\
                                            
    Automated Deployment Script v1.o (Full Auto DB + Next.js Build)
    \033[0m""")
    time.sleep(1)

    # Krok 0. Wybór i Setup Bazy Danych
    db_choice = ask_db_mode()
    if db_choice == '1':
        setup_database_local() #
    else:
        setup_database_docker()
        
    # Krok 0.5 Zależności systemowe dla Puppeteera
    install_puppeteer_deps()

    # 1. Create Next.js application
    print_step("Initializing Next.js environment (V.E.S.P.E.R. Core)...")
    run_command("npx create-next-app@15 vesper --typescript --tailwind --eslint --app --src-dir=false --import-alias=\"@/*\" --yes")
    
    # Change working directory
    os.chdir("vesper")

    # 2. Override package.json
    print_step("Configuring system dependencies (package.json)...")
    package_json = """{
  "name": "vesper",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@deck.gl/aggregation-layers": "^9.2.2",
    "@deck.gl/core": "^9.2.2",
    "@deck.gl/geo-layers": "^9.2.5",
    "@deck.gl/layers": "^9.2.2",
    "@deck.gl/mapbox": "^9.2.5",
    "@deck.gl/react": "^9.2.2",
    "@prisma/client": "^6.19.0",
    "@radix-ui/react-tooltip": "^1.1.8",
    "@react-pdf/renderer": "^4.3.2",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "framer-motion": "^12.23.24",
    "lucide-react": "^0.552.0",
    "mapbox-gl": "^3.16.0",
    "maplibre-gl": "^5.13.0",
    "next": "16.0.1",
    "next-themes": "^0.4.6",
    "openai": "^6.15.0",
    "puppeteer": "^24.34.0",
    "puppeteer-extra": "^3.3.6",
    "puppeteer-extra-plugin-stealth": "^2.11.2",
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "react-map-gl": "^8.1.0",
    "tailwind-merge": "^3.3.1"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.0.1",
    "prisma": "^6.19.0",
    "tailwindcss": "^4",
    "tw-animate-css": "^1.4.0",
    "typescript": "^5"
  }
}"""
    with open("package.json", "w", encoding="utf-8") as f:
        f.write(package_json)

    # 3. Install NPM packages
    print_step("Downloading and compiling modules (NPM)...")
    run_command("npm install --legacy-peer-deps")

    # 4. Shadcn UI setup
    print_step("Installing UI framework (shadcn)...")
    run_command("npx shadcn@latest init -d")
    run_command("npx shadcn@latest add button card input scroll-area avatar tooltip --yes")

    # 5. Directory structure
    print_step("Generating V.E.S.P.E.R. directory structure...")
    directories = [
        "app/api/manage-verified",
        "app/api/promote-leak",
        "app/api/save-media",
        "app/api/_vesper",
        "components/profile-view/tabs",
        "core/scraper-engine/extractors",
        "lib",
        "prisma",
        "types"
    ]
    for d in directories:
        os.makedirs(d, exist_ok=True)

    # Niezbędne dla sesji bota
    print_step("Creating instagram_cookies.json file...")
    if not os.path.exists("instagram_cookies.json"):
        with open("instagram_cookies.json", "w", encoding="utf-8") as f:
            f.write("[]\n")

    # 6. Generate configuration files
    print_step("Creating base configuration files...")
    
    utils_ts = """import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
"""
    with open("lib/utils.ts", "w", encoding="utf-8") as f: f.write(utils_ts)
    
    next_config = """import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  transpilePackages: [
    "deck.gl", "@deck.gl/core", "@deck.gl/layers", "@deck.gl/react",
    "@deck.gl/geo-layers", "@deck.gl/aggregation-layers", "@deck.gl/extensions",
    "@luma.gl/constants", "@luma.gl/core", "@luma.gl/engine", "@luma.gl/webgl",
    "@luma.gl/gltools", "@luma.gl/shadertools", "luma.gl", "react-map-gl", "maplibre-gl"
  ],
};
export default nextConfig;"""
    with open("next.config.ts", "w", encoding="utf-8") as f: f.write(next_config)

    db_ts = """import { PrismaClient } from "@prisma/client"
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: ["warn", "error"] })
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma"""
    with open("lib/db.ts", "w", encoding="utf-8") as f: f.write(db_ts)

    schema_prisma = """generator client {
  provider = "prisma-client-js"
}
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
model SocialBotTarget {
  id                  String   @id @default(cuid())
  username            String   @unique
  fullName            String?
  instagramPk         String?  @unique
  isBusiness          Boolean  @default(false)
  businessCategory    String?
  publicEmail         String?
  publicPhone         String?
  externalUrl         String?
  leakVerifiedEmails  String[] @default([]) 
  leakVerifiedPhones  String[] @default([])
  leakVerifiedPass    String[] @default([]) 
  leakVerifiedIps     String[] @default([])
  leakVerifiedDob     String?
  leakVerifiedAddress String?
  status              String   @default("active")
  risk                String   @default("unknown")
  notes               String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  snapshots           SocialBotSnapshot[]
  locations           SocialBotLocation[]
  breaches            IdentityBreach[]
}
model IdentityBreach {
  id          String   @id @default(cuid())
  targetId    String
  target      SocialBotTarget @relation(fields: [targetId], references: [id], onDelete: Cascade)
  sourceName  String
  breachDate  String?
  email       String?
  username    String?
  password    String?
  phone       String?
  ip          String?
  dob         String?
  address     String?
  searchQuery String
  confidence  String
  isPromoted  Boolean  @default(false)
  detectedAt  DateTime @default(now())
}
model SocialBotSnapshot {
  id             String   @id @default(cuid())
  targetId       String
  target         SocialBotTarget @relation(fields: [targetId], references: [id], onDelete: Cascade)
  bio            String?
  followerCount  Int?
  followingCount Int?
  localPath      String?
  rawJsonData    String?
  scrapedAt      DateTime @default(now())
}
model SocialBotLocation {
  id          String   @id @default(cuid())
  targetId    String
  target      SocialBotTarget @relation(fields: [targetId], references: [id], onDelete: Cascade)
  name        String
  lat         Float?
  lng         Float?
  address     String?
  city        String?
  detectedAt  DateTime @default(now())
}"""
    with open("prisma/schema.prisma", "w", encoding="utf-8") as f: f.write(schema_prisma)

    # Z.ENV
    env_data = """# NOTE: The URL must include the postgresql prefix.'postgresql://'
DATABASE_URL="postgresql://user_user:super_secret@localhost:5432/vesper_db?schema=public"
OPENAI_API_KEY="sk-..."
LEAKCHECK_API_KEY="..."
LEAKOSINT_API_KEY="..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
"""
    with open(".env", "w", encoding="utf-8") as f: f.write(env_data)

    # 7. Format Prisma, Generate Client, and Push Schema
    print_step("Optimizing database models and synchronizing schema...")
    run_command("npx prisma format")
    run_command("npx prisma generate")
    run_command("npx prisma db push") 

    # 8. Produkcyjne uruchomienie
    setup_production()

    print("\n\033[1;32m========================================================\033[0m")
    print("\033[1;32m[✓] V.E.S.P.E.R. SYSTEM DEPLOYED SUCCESSFULLY.\033[0m")
    print("\033[1;32m========================================================\033[0m")
    print("System is running in the background on PORT 3000 via PM2.")
    print("\nNext steps to perform manually in the 'vesper' directory:")
    print(" 1. Replace 'app/globals.css' and 'app/layout.tsx' with your custom styling.")
    print(" 2. Open 'instagram_cookies.json' and paste your valid session cookies! (Crucial for scraping)")
    print(" 3. Copy your .tsx and .ts files into their respective folders.")
    print(" 4. Use VS Code to safely update relative paths (e.g. '@/components').")
    print("\033[1;32m========================================================\033[0m\n")

if __name__ == "__main__":
    main()
