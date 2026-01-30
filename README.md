# 📝 Record Manager

**Record Manager** is a convenient Google Chrome extension that helps you save, organize, and quickly access text records, notes, response templates, or AI prompts.

The extension operates within the browser's **Side Panel**, allowing you to keep your notes open without obstructing the page content while you work.

## ✨ Features

* **Side Panel:** The window stays open and doesn't close when you click on the page, enabling parallel workflow.
* **Stylish Design:** Modern interface with Glassmorphism (frosted glass) effect.
* **Themes:** Supports both Dark 🌙 and Light ☀️ themes.
* **Categories:** Sort records by projects or topics (e.g., *Kamiqr*, *Personal*, *Work*).
* **Quick Copy:** Click on a card to instantly copy the text to the clipboard.
* **Search & Filter:** Instant search through your records content.

---

## 🚀 Installation

Since the extension is currently in local development, it requires manual installation:

1.  **Download this repository** (Click `Code` -> `Download ZIP` and extract it, or use `git clone`).
2.  Open Google Chrome.
3.  Type `chrome://extensions/` in the address bar and press Enter.
4.  Toggle the **"Developer mode"** switch in the top right corner.
5.  Click the **"Load unpacked"** button that appears on the left.
6.  Select the folder containing the `manifest.json` file (the root folder of the project).

✅ **Done!** The extension icon will appear in the Chrome toolbar.

---

## 📖 Usage Guide

### 1. Opening the Panel
Click the extension icon in the browser toolbar. The **Side Panel** will open on the right. You can resize it by dragging the left edge.

### 2. Creating a Record
1.  Select a **Category** from the dropdown menu (or create a new one in Settings).
2.  Type your text in the input field.
3.  Click the **"Save"** button.

### 3. Using Records
* **Copying:** Simply click on any record card — the text will be copied to your clipboard, and a "Copied! ✅" notification will appear.
* **Deleting:** Click the `×` cross icon in the corner of a card to delete the record.

### 4. Managing Categories
1.  Click the **Settings (⚙️)** button.
2.  Enter a name in the "New Category" field and click `+`.
3.  You can also delete unwanted categories here.

---

## 🛠 Tech Stack

* **HTML5 / CSS3** (CSS Variables, Flexbox, Backdrop-filter)
* **JavaScript** (Vanilla JS)
* **Chrome Extension API** (Storage, SidePanel)

---

Developed by Aydin Almassov
