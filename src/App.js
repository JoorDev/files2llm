import React, { useState } from 'react';

/**
 * A helper function that uses FileReader to read the file as text.
 * It returns a Promise that resolves with the file's text content.
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
}

/**
 * Convert the array of file objects to an XML string.
 */
function convertToXML(filesData) {
  let xml = '<files>';

  filesData.forEach((file) => {
    // Escape special XML chars in content
    const escapedContent = file.content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    xml += `
  <file name="${file.fileName}">${escapedContent}</file>`;
  });

  xml += '\n</files>';
  return xml;
}

/**
 * Convert the array of file objects to a Markdown string.
 */
function convertToMarkdown(filesData) {
  let md = '';
  filesData.forEach((file) => {
    md += `## ${file.fileName}
\`\`\`
${file.content}
\`\`\`

`;
  });
  return md.trim();
}

/**
 * Attempts to copy 'text' to the clipboard using either the
 * modern 'navigator.clipboard.writeText' or a fallback with
 * 'document.execCommand("copy")'.
 *
 * Some browsers (especially Firefox) block clipboard writes
 * without a user-initiated event, so this may fail silently
 * unless triggered by a user click.
 */
async function autoCopyToClipboard(text) {
  // Modern API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true; // success
    } catch (err) {
      // fallback below
    }
  }

  // Fallback: create a temporary <textarea> and execCommand('copy')
  try {
    const tempTextArea = document.createElement('textarea');
    tempTextArea.value = text;
    // Move it off-screen
    tempTextArea.style.position = 'fixed';
    tempTextArea.style.left = '-9999px';
    document.body.appendChild(tempTextArea);

    tempTextArea.select();
    document.execCommand('copy');
    document.body.removeChild(tempTextArea);
    return true;
  } catch (err) {
    return false;
  }
}

function App() {
  // Holds an array of { fileName, content }
  const [filesData, setFilesData] = useState([]);

  // Tracks the selected export format: 'json', 'xml', 'markdown'
  const [selectedExportFormat, setSelectedExportFormat] = useState('json');

  // For drag-and-drop highlighting
  const [isDragging, setIsDragging] = useState(false);

  // Tracks a message to display when copy occurs
  const [copyMessage, setCopyMessage] = useState('');

  /**
   * Returns the output string based on the selected export format
   */
  const getExportOutput = (data = filesData) => {
    switch (selectedExportFormat) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'xml':
        return convertToXML(data);
      case 'markdown':
        return convertToMarkdown(data);
      default:
        return '';
    }
  };

  /**
   * readAndSetFiles: takes an array of File objects, reads them, and updates filesData.
   * Then tries to auto-copy the combined result (may fail in Firefox if no user gesture).
   */
  const readAndSetFiles = async (fileArray) => {
    try {
      const results = await Promise.all(
        fileArray.map(async (file) => {
          const content = await readFileAsText(file);
          return { fileName: file.name, content };
        })
      );

      // Build the new array of files
      const newData = [...filesData, ...results];
      setFilesData(results);

      // Attempt automatic copy
      const exported = getExportOutput(results);
      const success = await autoCopyToClipboard(exported);
      setCopyMessage(success ? 'Copied to clipboard!' : 'Clipboard copy failed.');
      setTimeout(() => setCopyMessage(''), 3000);
    
    } catch (error) {
      console.error('Error reading files:', error);
    }
  };

  /**
   * Handle file input from the <input type="file" /> element
   */
  const handleFileInputChange = async (event) => {
    const { files } = event.target;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    await readAndSetFiles(fileArray);
  };

  /**
   * Drag-and-drop handlers
   */
  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(event.dataTransfer.files);
    await readAndSetFiles(droppedFiles);
  };

  /**
   * Clears all uploaded file data
   */
  const clearFiles = () => {
    setFilesData([]);
    setCopyMessage('');
  };

  /**
   * Manually copy the current export output to the clipboard (button).
   */
  const copyManually = async () => {
    const textToCopy = getExportOutput();
    const success = await autoCopyToClipboard(textToCopy);

    if (success) {
      setCopyMessage('Copied to clipboard (manual)!');
    } else {
      setCopyMessage('Manual copy failed or was blocked in Firefox.');
    }
    setTimeout(() => setCopyMessage(''), 3000);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(to bottom right, #f0f9ff, #cfe7f3)',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          width: '90%',
          maxWidth: '800px',
          padding: '2rem',
          borderRadius: '1rem',
          backgroundColor: '#fff',
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
          transition: 'background-color 0.2s ease-in-out',
          textAlign: 'center',
          border: isDragging ? '3px dashed #2490f1' : '3px dashed #ccc',
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <h1 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#333' }}>
          Drag & Drop File Reader
        </h1>
        <p style={{ marginBottom: '1.5rem', color: '#555' }}>
          Drop your files here or select from your computer:
        </p>

        {/* File input */}
        <input
          type="file"
          multiple
          onChange={handleFileInputChange}
          style={{
            display: 'block',
            margin: '0 auto 1rem auto',
          }}
        />

        {/* Dropdown to select export format */}
        <div style={{ margin: '1rem 0' }}>
          <label
            htmlFor="exportFormat"
            style={{ marginRight: '0.5rem', fontWeight: 'bold', color: '#333' }}
          >
            Export Format:
          </label>
          <select
            id="exportFormat"
            value={selectedExportFormat}
            onChange={(e) => setSelectedExportFormat(e.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: '0.25rem',
              border: '1px solid #ccc',
              cursor: 'pointer',
            }}
          >
            <option value="json">JSON</option>
            <option value="xml">XML</option>
            <option value="markdown">Markdown</option>
          </select>
        </div>

        {/* Clear button */}
        <button
          onClick={clearFiles}
          style={{
            padding: '0.6rem 1.2rem',
            cursor: 'pointer',
            backgroundColor: '#2490f1',
            color: '#fff',
            border: 'none',
            borderRadius: '0.25rem',
            fontWeight: 'bold',
            boxShadow: '0 4px 8px rgba(36, 144, 241, 0.3)',
            transition: 'background-color 0.2s ease',
            marginRight: '1rem',
          }}
          onMouseEnter={(e) => (e.target.style.backgroundColor = '#1678d3')}
          onMouseLeave={(e) => (e.target.style.backgroundColor = '#2490f1')}
        >
          Clear Files
        </button>

        {/* Manual copy button: visible if there's any file data */}
        {filesData.length > 0 && (
          <button
            onClick={copyManually}
            style={{
              padding: '0.6rem 1.2rem',
              cursor: 'pointer',
              backgroundColor: '#2ecc71',
              color: '#fff',
              border: 'none',
              borderRadius: '0.25rem',
              fontWeight: 'bold',
              boxShadow: '0 4px 8px rgba(46, 204, 113, 0.3)',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#27ae60')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#2ecc71')}
          >
            Copy Manually
          </button>
        )}

        {/* Display the exported output */}
        {filesData.length > 0 && (
          <div
            style={{
              marginTop: '2rem',
              textAlign: 'left',
              backgroundColor: '#f9f9f9',
              borderRadius: '0.5rem',
              padding: '1rem',
              boxShadow: 'inset 0 1px 4px rgba(0, 0, 0, 0.05)',
              maxHeight: '400px',
              overflowY: 'auto',
            }}
          >
            <h2
              style={{
                fontSize: '1.2rem',
                marginBottom: '0.5rem',
                color: '#333',
              }}
            >
              Exported Files
            </h2>
            {/* Show a message if auto or manual copy succeeded or failed */}
            {copyMessage && (
              <div
                style={{
                  backgroundColor: '#f0f8ff',
                  padding: '0.5rem 1rem',
                  marginBottom: '0.5rem',
                  borderRadius: '0.25rem',
                  color: '#333',
                }}
              >
                {copyMessage}
              </div>
            )}
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                lineHeight: '1.4',
              }}
            >
              {getExportOutput()}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;