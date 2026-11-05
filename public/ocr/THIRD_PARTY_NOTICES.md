# OCR runtime assets

These files are served by this application from `/ocr/`; runtime downloads from a CDN are disabled.

- Tesseract.js worker 7.0.0, Apache-2.0: `worker.min.js`
- Tesseract.js Core 7.0.0, Apache-2.0: `core/`
- tessdata_fast Hungarian LSTM model (Apache-2.0): `lang/hun.traineddata.gz`

The corresponding license texts are included beside this file. The language model was downloaded from the official `tesseract-ocr/tessdata_fast` repository and gzip-compressed for same-origin delivery. SHA-256 checksums for the vendored OCR runtime are recorded in `docs/AI_DRAWING_IMPLEMENTATION_PLAN.md`.
