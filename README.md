# ORISO Platform Documentation

[![Mintlify](https://img.shields.io/badge/Mintlify-Powered-blue)](https://mintlify.com)

> Comprehensive deployment and configuration guide for ORISO (Online Beratung) Platform

🔗 **[View Live Documentation](https://docs.oriso.site)**

---

## 📖 About

Step-by-step documentation for deploying ORISO Platform on Ubuntu Server. ORISO is an online consultation platform built with microservices, Kubernetes, Keycloak, and modern web technologies.

## 🚀 Quick Start

### Local Development

```bash
# Install Mint CLI
npm install -g mint

# Clone repository
git clone <repository-url>
cd ORISO-Docs

# Start preview server
mint dev
```

Open `http://localhost:3000` in your browser.

### Check for Broken Links

```bash
mint broken-links
```

## 📁 Project Structure

```
ORISO-Docs/
├── docs.json              # Mintlify configuration
├── index.mdx              # Home page
├── favicon.svg
├── logo/
│   ├── light.svg
│   └── dark.svg
└── oriso-platform/        # Documentation pages
    ├── overview.mdx
    ├── initial-setup.mdx
    ├── deploy-*.mdx
    ├── troubleshooting.mdx
    └── ...
```

## ✏️ Contributing

1. Edit `.mdx` files in `oriso-platform/`
2. Preview locally with `mint dev`
3. Update `docs.json` navigation if adding new pages
4. Commit and push changes

### Adding a New Page

1. Create `.mdx` file with frontmatter:

   ```yaml
   ---
   title: "Page Title"
   description: "Page description"
   ---
   ```
2. Add to `docs.json`:

   ```json
   "pages": ["oriso-platform/new-page"]
   ```

## 🛠️ Technology Stack

- **Mintlify** - Documentation framework
- **MDX** - Markdown with JSX
- **Next.js** - Rendering

## 📋 Useful Commands

| Command               | Description            |
| --------------------- | ---------------------- |
| `mint dev`          | Start local preview    |
| `mint broken-links` | Check for broken links |
| `mint check`        | Validate configuration |

## 🔗 Links

- **Live Site:** https://docs.oriso.site
- **Mintlify Docs:** https://mintlify.com/docs

---

**Maintained by:** ORISO Platform Team | **Last Updated:** November 2025
