# Photo Metadata Inspector

Drop a photo and reveal the hidden details it carries — camera model, capture settings, date taken, and GPS coordinates. If the photo has location data, you'll get a clickable link that opens the spot on OpenStreetMap.

> **NOTE:** Everything runs locally in your browser. Photos are read with the [`exifr`](https://github.com/MikeKovarik/exifr) library on your device and are never uploaded anywhere.

## Features

- Client-side EXIF parsing
- Thumbnail preview of the selected image.
- Metadata grouped into readable sections: Camera, Capture settings, Image, GPS.
- Clickable OpenStreetMap link when GPS coordinates are present.

## Tech Stack

- [Vite](https://vite.dev/) + TypeScript
- [exifr](https://github.com/MikeKovarik/exifr) for metadata parsing
- Plain CSS

## Getting Started

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```
