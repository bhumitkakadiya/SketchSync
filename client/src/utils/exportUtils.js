import { jsPDF } from 'jspdf';

/**
 * Export canvas as PNG download
 */
export const exportAsPNG = (canvas, filename = 'sketchsync-canvas.png') => {
  if (!canvas) return;
  const dataURL = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = filename;
  link.click();
};

/**
 * Export canvas as PDF download
 */
export const exportAsPDF = (canvas, filename = 'sketchsync-canvas.pdf') => {
  if (!canvas) return;
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [canvas.width, canvas.height],
  });
  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
  pdf.save(filename);
};

/**
 * Get canvas data URL for snapshot saving
 */
export const getSnapshotDataURL = (canvas) => {
  if (!canvas) return null;
  return canvas.toDataURL('image/jpeg', 0.8); // JPEG for smaller size
};
