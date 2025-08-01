'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Flex,
  Text,
  TextField
} from '@radix-ui/themes';
import {
  Root as ProgressRoot,
  Indicator as ProgressIndicator
} from '@radix-ui/react-progress';

interface ReportMeta {
  id: string;
  symbol: string;
  created: number;
}

export default function Page() {
  const [symbol, setSymbol] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportMeta[]>([]);
  const [options, setOptions] = useState({ analysis: true, news: true });

  useEffect(() => {
    fetch('/api/reports')
      .then((r) => r.json())
      .then(setReports)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (symbol.length < 2) {
      setSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    fetch(`/api/search?q=${symbol}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then(setSuggestions)
      .catch(() => {});
    return () => ctrl.abort();
  }, [symbol]);

  async function startResearch() {
    setLoading(true);
    setProgress(0);
    setStatus('Starting research...');
    setReport(null);
    setReportId(null);
    const res = await fetch(`/api/research?symbol=${encodeURIComponent(symbol)}`);
    setReportId(res.headers.get('x-report-id'));
    if (!res.body) {
      setLoading(false);
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let received = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.type === 'status') {
            setProgress(data.progress);
            setStatus(data.message);
          } else if (data.type === 'report') {
            received += data.content;
          }
        } catch {
          // ignore parse errors
        }
      }
    }
    setReport(received);
    setLoading(false);
    fetch('/api/reports')
      .then((r) => r.json())
      .then(setReports)
      .catch(() => {});
  }

  return (
    <Flex direction="column" style={{ minHeight: '100vh' }}>
      <header>
        <Box p="3" style={{ borderBottom: '1px solid var(--gray-6)' }}>
          <Text weight="bold">Equity Research Dashboard</Text>
        </Box>
      </header>
      <Flex align="center" justify="center" style={{ flex: 1 }}>
        <Box style={{ width: 400 }}>
          <TextField.Root>
            <TextField.Input
              placeholder="Search ticker..."
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            />
          </TextField.Root>
          {suggestions.length > 0 && (
            <Box
              mt="1"
              style={{
                border: '1px solid var(--gray-6)',
                borderRadius: 4,
                maxHeight: 150,
                overflow: 'auto'
              }}
            >
              {suggestions.map((s) => (
                <Box
                  key={s}
                  p="2"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSymbol(s);
                    setSuggestions([]);
                  }}
                >
                  <Text>{s}</Text>
                </Box>
              ))}
            </Box>
          )}
          {symbol && (
            <Box mt="4">
              <Text mb="2" as="p">
                Research Options
              </Text>
              <Flex direction="column" gap="2">
                <label>
                  <Flex gap="2" align="center">
                    <Checkbox
                      checked={options.analysis}
                      onCheckedChange={(v) =>
                        setOptions((o) => ({ ...o, analysis: v === true }))
                      }
                    />
                    <Text>Fundamental Analysis</Text>
                  </Flex>
                </label>
                <label>
                  <Flex gap="2" align="center">
                    <Checkbox
                      checked={options.news}
                      onCheckedChange={(v) =>
                        setOptions((o) => ({ ...o, news: v === true }))
                      }
                    />
                    <Text>News Analysis</Text>
                  </Flex>
                </label>
              </Flex>
              <Flex justify="end" mt="4">
                <Button disabled={loading} onClick={startResearch}>
                  Start Research
                </Button>
              </Flex>
            </Box>
          )}
          {loading && (
            <Box mt="4">
              <ProgressRoot
                value={progress}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  background: 'var(--gray-6)',
                  borderRadius: 4,
                  width: '100%',
                  height: 10
                }}
              >
                <ProgressIndicator
                  style={{
                    background: 'var(--accent-9)',
                    width: `${progress}%`,
                    height: '100%'
                  }}
                />
              </ProgressRoot>
              <Text size="2">{status}</Text>
            </Box>
          )}
          {report && (
            <Box mt="4">
              {reportId && (
                <Button asChild mb="3">
                  <a href={`/api/report/${reportId}/pdf`}>Download PDF</a>
                </Button>
              )}
              <Box
                style={{
                  border: '1px solid var(--gray-6)',
                  borderRadius: 4,
                  padding: '12px',
                  maxHeight: 300,
                  overflow: 'auto'
                }}
              >
                <Text as="p" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                  {report}
                </Text>
              </Box>
            </Box>
          )}
        </Box>
      </Flex>
      <footer>
        <Box p="3" style={{ borderTop: '1px solid var(--gray-6)' }}>
          <Text weight="bold">Previous Reports</Text>
          <Flex gap="2" wrap="wrap" mt="2">
            {reports.map((r) => (
              <Button asChild key={r.id} variant="soft">
                <a href={`/api/report/${r.id}/pdf`}>
                  {r.symbol} ({new Date(r.created).toLocaleDateString()})
                </a>
              </Button>
            ))}
          </Flex>
        </Box>
      </footer>
    </Flex>
  );
}
