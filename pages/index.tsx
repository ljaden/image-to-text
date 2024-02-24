import { useEffect, useRef, useState } from 'react';
import { Group, Stack, Text, Image, Progress, Button } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { createWorker } from 'tesseract.js';

const Home = () => {
  const [imageDataArray, setImageDataArray] = useState<(string | null)[]>([]);

const loadFiles = (files: File[]) => {
  const dataTransfer = new DataTransfer();
  files.forEach(file => dataTransfer.items.add(file));

  const imagePromises = Array.from(dataTransfer.files).map(file => {
    return new Promise<string | null>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageDataUri = reader.result;
        resolve(imageDataUri as string);
      };
      reader.readAsDataURL(file);
    });
  });

  Promise.all(imagePromises).then(imageDataArray => {
    setImageDataArray(imageDataArray);
  });
};
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('idle');
  const [ocrResults, setOcrResults] = useState<string[]>([]);

  const workerRef = useRef<Tesseract.Worker | null>(null);
  useEffect(() => {
    workerRef.current = createWorker({
      logger: message => {
        if ('progress' in message) {
          setProgress(message.progress);
          setProgressLabel(message.progress === 1 ? 'Done' : message.status);
        }
      }
    });
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    }
  }, []);

const handleExtract = async () => {
  setProgress(0);
  setProgressLabel('starting');
  setOcrResults([]);

  const worker = workerRef.current!;
  await worker.load();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');

  for (const imageData of imageDataArray) {
    try {
      const response = await worker.recognize(imageData!);
        const regex = /\b\d{12,13}\b/g;
        const match = response.data.text.match(regex)
        if (match) {
          setOcrResults(prevResults => [...prevResults, match[0]]); // Store OCR result in state
        }
    } catch (error) {
      console.error('Error during OCR:', error);
    }
  }
};
  const generateCSV = () => {
    // Add your CSV generation logic here based on ocrResults
      // Convert the array of numbers to a CSV string
  const csvContent = "data:text/csv;charset=utf-8," + ocrResults.join("\n");

  // Create a download link for the CSV file
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "ocr_results.csv");

  // Append the link to the document and trigger a click event to initiate the download
  document.body.appendChild(link);
  link.click();
  };

  return (<>
      <Group style={{ padding: '10px' }}>
        <Button onClick={generateCSV}>Download CSV</Button>
      </Group>
    <Group align='initial' style={{ padding: '10px' }}>
      <Stack style={{ flex: '1' }}>
        <Dropzone
          onDrop={(files) => loadFiles(files)} // Updated to handle multiple files
          accept={IMAGE_MIME_TYPE}
        >{() => (
          <Text size="xl" inline>
            Drag images here or click to select files
          </Text>
        )}</Dropzone>

        {imageDataArray.map((imageData, index) => (
          <div key={index}>
            {!!imageData && <Image src={imageData} style={{ width: '100%' }} />}
          </div>
        ))}
      </Stack>

      <Stack style={{ flex: '1' }}>
        <Button disabled={imageDataArray.length === 0 || !workerRef.current} onClick={handleExtract}>Extract</Button>
        <Text>{progressLabel.toUpperCase()}</Text>
        <Progress value={progress * 100} />

        {ocrResults.map((result, index) => (
          <Stack key={index}>
            <Text size='xl'>RESULT {index + 1}</Text>
            <Text style={{ fontFamily: 'monospace', background: 'black', padding: '10px' }}>{result}</Text>
          </Stack>
        ))}
      </Stack>
    </Group>
  </>);
}

export default Home;
