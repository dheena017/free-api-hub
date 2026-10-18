export type SnippetLanguage =
  | 'curl'
  | 'js'
  | 'axios'
  | 'ts'
  | 'python'
  | 'python-async'
  | 'go'
  | 'php'
  | 'java'
  | 'csharp'
  | 'rust'
  | 'dart'
  | 'swift'
  | 'ruby';

export interface LanguageOption {
  id: SnippetLanguage;
  label: string;
  category: 'CLI' | 'JavaScript' | 'Python' | 'Backend' | 'Mobile / Systems';
  fileExt: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { id: 'curl', label: 'cURL', category: 'CLI', fileExt: 'sh' },
  { id: 'js', label: 'JavaScript (Fetch)', category: 'JavaScript', fileExt: 'js' },
  { id: 'axios', label: 'Node.js (Axios)', category: 'JavaScript', fileExt: 'js' },
  { id: 'ts', label: 'TypeScript', category: 'JavaScript', fileExt: 'ts' },
  { id: 'python', label: 'Python (requests)', category: 'Python', fileExt: 'py' },
  { id: 'python-async', label: 'Python (httpx async)', category: 'Python', fileExt: 'py' },
  { id: 'go', label: 'Go (net/http)', category: 'Backend', fileExt: 'go' },
  { id: 'php', label: 'PHP (cURL)', category: 'Backend', fileExt: 'php' },
  { id: 'java', label: 'Java (HttpClient)', category: 'Backend', fileExt: 'java' },
  { id: 'csharp', label: 'C# (.NET)', category: 'Backend', fileExt: 'cs' },
  { id: 'rust', label: 'Rust (reqwest)', category: 'Backend', fileExt: 'rs' },
  { id: 'dart', label: 'Dart / Flutter', category: 'Mobile / Systems', fileExt: 'dart' },
  { id: 'swift', label: 'Swift (URLSession)', category: 'Mobile / Systems', fileExt: 'swift' },
  { id: 'ruby', label: 'Ruby (Net::HTTP)', category: 'Backend', fileExt: 'rb' }
];

export function buildFullUrl(url: string, params: Record<string, string> = {}): string {
  try {
    const parsed = new URL(url);
    for (const [k, v] of Object.entries(params)) {
      if (k.trim()) parsed.searchParams.set(k, v);
    }
    return parsed.toString();
  } catch {
    const queryString = Object.entries(params)
      .filter(([k]) => k.trim())
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    if (!queryString) return url;
    return url.includes('?') ? `${url}&${queryString}` : `${url}?${queryString}`;
  }
}

function parseQueryParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  try {
    const parsed = new URL(url);
    parsed.searchParams.forEach((val, key) => {
      params[key] = val;
    });
  } catch {
    const qIndex = url.indexOf('?');
    if (qIndex !== -1) {
      const q = url.slice(qIndex + 1);
      q.split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }
  }
  return params;
}

export function formatLatencyBadge(latencyMs?: number | null): { label: string; colorClass: string } {
  if (latencyMs == null || latencyMs <= 0) {
    return { label: 'Untested', colorClass: 'text-slate-400 bg-slate-500/10 border-slate-500/30' };
  } else if (latencyMs < 150) {
    return { label: `${latencyMs}ms (Blazing)`, colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
  } else if (latencyMs < 400) {
    return { label: `${latencyMs}ms (Good)`, colorClass: 'text-sky-400 bg-sky-500/10 border-sky-500/30' };
  } else {
    return { label: `${latencyMs}ms (Slow)`, colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
  }
}

export function generateCurlSnippet(
  url: string,
  method: string = 'GET',
  headers: Record<string, string> = {},
  params: Record<string, string> = {},
  body?: string
): string {
  const fullUrl = buildFullUrl(url, params);
  let cmd = `curl -X ${method.toUpperCase()} "${fullUrl}"`;

  for (const [key, val] of Object.entries(headers)) {
    cmd += ` \\\n  -H "${key}: ${val}"`;
  }

  if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
    if (!headers['Content-Type'] && !headers['content-type']) {
      cmd += ` \\\n  -H "Content-Type: application/json"`;
    }
    const escapedBody = body.replace(/"/g, '\\"');
    cmd += ` \\\n  -d "${escapedBody}"`;
  }

  return cmd;
}

export function generateJsSnippet(
  url: string,
  method: string = 'GET',
  headers: Record<string, string> = {},
  params: Record<string, string> = {},
  body?: string
): string {
  const fullUrl = buildFullUrl(url, params);
  const options: Record<string, unknown> = {
    method: method.toUpperCase()
  };

  const finalHeaders = { ...headers };
  if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
    if (!finalHeaders['Content-Type']) {
      finalHeaders['Content-Type'] = 'application/json';
    }
  }

  if (Object.keys(finalHeaders).length > 0) {
    options.headers = finalHeaders;
  }

  if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
    try {
      options.body = JSON.parse(body);
    } catch {
      options.body = body;
    }
  }

  let code = `// Free API Hub — In-Browser JavaScript Example\n`;
  code += `const url = "${fullUrl}";\n\n`;
  code += `const response = await fetch(url, {\n`;
  code += `  method: "${method.toUpperCase()}",\n`;
  if (Object.keys(finalHeaders).length > 0) {
    code += `  headers: ${JSON.stringify(finalHeaders, null, 4).replace(/\n/g, '\n  ')},\n`;
  }
  if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
    code += `  body: JSON.stringify(${body.trim().startsWith('{') || body.trim().startsWith('[') ? body.trim() : JSON.stringify(body)})\n`;
  }
  code += `});\n\n`;
  code += `if (!response.ok) {\n`;
  code += `  throw new Error(\`HTTP error! status: \${response.status}\`);\n`;
  code += `}\n\n`;
  code += `const data = await response.json();\n`;
  code += `console.log(data);`;

  return code;
}

export function generateAxiosSnippet(
  url: string,
  method: string = 'GET',
  headers: Record<string, string> = {},
  params: Record<string, string> = {},
  body?: string
): string {
  const cleanUrl = url.split('?')[0];
  const urlParams = parseQueryParams(url);
  const mergedParams = { ...urlParams, ...params };

  let code = `import axios from 'axios';\n\n`;
  code += `try {\n`;
  code += `  const response = await axios({\n`;
  code += `    method: '${method.toLowerCase()}',\n`;
  code += `    url: '${cleanUrl}',\n`;

  if (Object.keys(mergedParams).length > 0) {
    code += `    params: ${JSON.stringify(mergedParams, null, 6).trim()},\n`;
  }

  if (Object.keys(headers).length > 0) {
    code += `    headers: ${JSON.stringify(headers, null, 6).trim()},\n`;
  }

  if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
    try {
      code += `    data: ${JSON.stringify(JSON.parse(body), null, 6).trim()},\n`;
    } catch {
      code += `    data: ${JSON.stringify(body)},\n`;
    }
  }

  code += `    timeout: 10000\n`;
  code += `  });\n\n`;
  code += `  console.log('Status:', response.status);\n`;
  code += `  console.log('Data:', response.data);\n`;
  code += `} catch (error) {\n`;
  code += `  console.error('Request failed:', error.message);\n`;
  code += `}`;

  return code;
}

export function generateTypeScriptSnippet(
  url: string,
  method: string = 'GET',
  headers: Record<string, string> = {},
  params: Record<string, string> = {},
  body?: string
): string {
  const fullUrl = buildFullUrl(url, params);

  let code = `// Define typed payload interface\n`;
  code += `interface ApiResponse<T = unknown> {\n`;
  code += `  data: T;\n`;
  code += `  status: number;\n`;
  code += `}\n\n`;
  code += `async function executeRequest<T>(): Promise<T> {\n`;
  code += `  const response = await fetch("${fullUrl}", {\n`;
  code += `    method: "${method.toUpperCase()}",\n`;

  const finalHeaders = { ...headers };
  if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
    finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json';
  }

  if (Object.keys(finalHeaders).length > 0) {
    code += `    headers: ${JSON.stringify(finalHeaders, null, 6).replace(/\n/g, '\n    ')},\n`;
  }

  if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
    code += `    body: JSON.stringify(${body.trim()}),\n`;
  }

  code += `  });\n\n`;
  code += `  if (!response.ok) {\n`;
  code += `    throw new Error(\`Request error: \${response.status} \${response.statusText}\`);\n`;
  code += `  }\n\n`;
  code += `  return response.json() as Promise<T>;\n`;
  code += `}\n\n`;
  code += `// Execution\n`;
  code += `const result = await executeRequest();\n`;
  code += `console.log(result);`;

  return code;
}

export function generatePythonSnippet(
  url: string,
  method: string = 'GET',
  headers: Record<string, string> = {},
  params: Record<string, string> = {},
  body?: string
): string {
  const cleanUrl = url.split('?')[0];
  const urlParams = parseQueryParams(url);
  const mergedParams = { ...urlParams, ...params };

  const hasParams = Object.keys(mergedParams).length > 0;
  const hasHeaders = Object.keys(headers).length > 0;
  const hasBody = Boolean(body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase()));

  let code = `import requests\n\n`;
  code += `url = "${cleanUrl}"\n`;

  if (hasParams) {
    code += `params = ${JSON.stringify(mergedParams, null, 4)}\n`;
  }
  if (hasHeaders) {
    code += `headers = ${JSON.stringify(headers, null, 4)}\n`;
  }
  if (hasBody) {
    try {
      code += `payload = ${JSON.stringify(JSON.parse(body || '{}'), null, 4)}\n`;
    } catch {
      code += `payload = ${JSON.stringify(body)}\n`;
    }
  }

  const args = ['url'];
  if (hasParams) args.push('params=params');
  if (hasHeaders) args.push('headers=headers');
  if (hasBody) args.push('json=payload');
  args.push('timeout=10');

  code += `\nresponse = requests.${method.toLowerCase()}(${args.join(', ')})\n`;
  code += `response.raise_for_status()\n`;
  code += `data = response.json()\n`;
  code += `print("Response Status:", response.status_code)\n`;
  code += `print("Data:", data)\n`;

  return code;
}

export function generatePythonHttpxSnippet(
  url: string,
  method: string = 'GET',
  headers: Record<string, string> = {},
  params: Record<string, string> = {},
  body?: string
): string {
  const cleanUrl = url.split('?')[0];
  const urlParams = parseQueryParams(url);
  const mergedParams = { ...urlParams, ...params };

  let code = `import asyncio\nimport httpx\n\n`;
  code += `async function main():\n`;
  code += `    async with httpx.AsyncClient(timeout=10.0) as client:\n`;
  code += `        response = await client.request(\n`;
  code += `            method="${method.toUpperCase()}",\n`;
  code += `            url="${cleanUrl}",\n`;

  if (Object.keys(mergedParams).length > 0) {
    code += `            params=${JSON.stringify(mergedParams, null, 16).trim()},\n`;
  }
  if (Object.keys(headers).length > 0) {
    code += `            headers=${JSON.stringify(headers, null, 16).trim()},\n`;
  }
  if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
    try {
      code += `            json=${JSON.stringify(JSON.parse(body), null, 16).trim()},\n`;
    } catch {
      code += `            content=${JSON.stringify(body)},\n`;
    }
  }

  code += `        )\n`;
  code += `        print("Status:", response.status_code)\n`;
  code += `        print("JSON Body:", response.json())\n\n`;
  code += `asyncio.run(main())\n`;

  return code;
}

export function generateGoSnippet(
  url: string,
  method: string = 'GET',
  headers: Record<string, string> = {},
  params: Record<string, string> = {},
  body?: string
): string {
  const fullUrl = buildFullUrl(url, params);
  const hasBody = Boolean(body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase()));

  return `package main

import (
\t"fmt"
\t"io"
\t"net/http"
\t"time"${hasBody ? '\n\t"strings"' : ''}
)

func main() {
\tclient := &http.Client{
\t\tTimeout: 10 * time.Second,
\t}

\treq, err := http.NewRequest("${method.toUpperCase()}", "${fullUrl}", ${hasBody ? `strings.NewReader(\`${body}\`)` : 'nil'})
\tif err != nil {
\t\tpanic(err)
\t}
${Object.entries(headers).map(([k, v]) => `\treq.Header.Set("${k}", "${v}")`).join('\n')}${hasBody && !headers['Content-Type'] ? '\n\treq.Header.Set("Content-Type", "application/json")' : ''}

\tresp, err := client.Do(req)
\tif err != nil {
\t\tpanic(err)
\t}
\tdefer resp.Body.Close()

\tbody, err := io.ReadAll(resp.Body)
\tif err != nil {
\t\tpanic(err)
\t}

\tfmt.Printf("HTTP Status: %d\\n", resp.StatusCode)
\tfmt.Println(string(body))
}`;
}

export function generatePhpSnippet(
  url: string,
  method: string = 'GET',
  headers: Record<string, string> = {},
  params: Record<string, string> = {},
  body?: string
): string {
  const fullUrl = buildFullUrl(url, params);
  const headerLines = Object.entries(headers).map(([k, v]) => `        "${k}: ${v}",`);
  if (body && !headers['Content-Type']) {
    headerLines.push('        "Content-Type: application/json",');
  }

  let code = `<?php\n\n`;
  code += `$curl = curl_init();\n\n`;
  code += `curl_setopt_array($curl, [\n`;
  code += `    CURLOPT_URL => "${fullUrl}",\n`;
  code += `    CURLOPT_RETURNTRANSFER => true,\n`;
  code += `    CURLOPT_TIMEOUT => 10,\n`;
  code += `    CURLOPT_CUSTOMREQUEST => "${method.toUpperCase()}",\n`;

  if (headerLines.length > 0) {
    code += `    CURLOPT_HTTPHEADER => [\n${headerLines.join('\n')}\n    ],\n`;
  }

  if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
    code += `    CURLOPT_POSTFIELDS => '${body.replace(/'/g, "\\'")}',\n`;
  }

  code += `]);\n\n`;
  code += `$response = curl_exec($curl);\n`;
  code += `$httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);\n\n`;
  code += `if (curl_errno($curl)) {\n`;
  code += `    echo 'Error: ' . curl_error($curl);\n`;
  code += `} else {\n`;
  code += `    echo "HTTP Status: " . $httpCode . "\\n";\n`;
  code += `    echo $response;\n`;
  code += `}\n\n`;
  code += `curl_close($curl);\n`;

  return code;
}

export function generateJavaSnippet(
  url: string,
  method: string = 'GET',
  headers: Record<string, string> = {},
  params: Record<string, string> = {},
  body?: string
): string {
  const fullUrl = buildFullUrl(url, params);
  const hasBody = Boolean(body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase()));

  return `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

public class ApiClient {
    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

        HttpRequest.Builder builder = HttpRequest.newBuilder()
            .uri(URI.create("${fullUrl}"))
            .timeout(Duration.ofSeconds(10));
${Object.entries(headers).map(([k, v]) => `        builder.header("${k}", "${v}");`).join('\n')}
${hasBody ? `        builder.method("${method.toUpperCase()}", HttpRequest.BodyPublishers.ofString("${body?.replace(/"/g, '\\"')}"));` : `        builder.method("${method.toUpperCase()}", HttpRequest.BodyPublishers.noBody());`}

        HttpResponse<String> response = client.send(builder.build(), HttpResponse.BodyHandlers.ofString());

        System.out.println("Status: " + response.statusCode());
        System.out.println("Payload: " + response.body());
    }
}`;
}

export function generateCSharpSnippet(
  url: string,
  method: string = 'GET',
  headers: Record<string, string> = {},
  params: Record<string, string> = {},
  body?: string
): string {
  const fullUrl = buildFullUrl(url, params);
  const hasBody = Boolean(body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase()));

  return `using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

class Program {
    static async Task Main(string[] args) {
        using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
        using var request = new HttpRequestMessage(HttpMethod.${method.charAt(0).toUpperCase() + method.slice(1).toLowerCase()}, "${fullUrl}");

${Object.entries(headers).map(([k, v]) => `        request.Headers.TryAddWithoutValidation("${k}", "${v}");`).join('\n')}
${hasBody ? `        request.Content = new StringContent("${body?.replace(/"/g, '\\"')}", Encoding.UTF8, "application/json");\n` : ''}
        var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();

        string result = await response.Content.ReadAsStringAsync();
        Console.WriteLine($"Status: {(int)response.StatusCode}");
        Console.WriteLine(result);
    }
}`;
}

export function generateRustSnippet(
  url: string,
  method: string = 'GET',
  headers: Record<string, string> = {},
  params: Record<string, string> = {},
  body?: string
): string {
  const fullUrl = buildFullUrl(url, params);
  const hasBody = Boolean(body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase()));

  return `// Cargo.toml dependencies:
// reqwest = { version = "0.11", features = ["json"] }
// tokio = { version = "1", features = ["full"] }

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

    let mut request = client.${method.toLowerCase()}("${fullUrl}");
${Object.entries(headers).map(([k, v]) => `    request = request.header("${k}", "${v}");`).join('\n')}
${hasBody ? `    request = request.header("Content-Type", "application/json");\n    request = request.body(r#"${body}"#);` : ''}

    let response = request.send().await?;
    println!("Status: {}", response.status());

    let body = response.text().await?;
    println!("Body: {}", body);

    Ok(())
}`;
}

export function generateDartSnippet(
  url: string,
  method: string = 'GET',
  headers: Record<string, string> = {},
  params: Record<string, string> = {},
  body?: string
): string {
  const fullUrl = buildFullUrl(url, params);
  const hasBody = Boolean(body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase()));

  return `// pubspec.yaml: http: ^1.2.0
import 'dart:convert';
import 'package:http/http.dart' as http;

Future<void> main() async {
  final url = Uri.parse('${fullUrl}');
  final headers = <String, String>{
${Object.entries(headers).map(([k, v]) => `    '${k}': '${v}',`).join('\n')}
${hasBody && !headers['Content-Type'] ? "    'Content-Type': 'application/json',\n" : ''}  };

  final response = await http.${method.toLowerCase()}(
    url,
    headers: headers,${hasBody ? `\n    body: jsonEncode(${body}),` : ''}
  );

  print('Response Status: \${response.statusCode}');
  if (response.statusCode >= 200 && response.statusCode < 300) {
    final data = jsonDecode(response.body);
    print(data);
  } else {
    print('Failed with status: \${response.statusCode}');
  }
}`;
}

export function generateSwiftSnippet(
  url: string,
  method: string = 'GET',
  headers: Record<string, string> = {},
  params: Record<string, string> = {},
  body?: string
): string {
  const fullUrl = buildFullUrl(url, params);
  const hasBody = Boolean(body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase()));

  return `import Foundation

guard let url = URL(string: "${fullUrl}") else {
    fatalError("Invalid Target URL")
}

var request = URLRequest(url: url)
request.httpMethod = "${method.toUpperCase()}"
request.timeoutInterval = 10.0

${Object.entries(headers).map(([k, v]) => `request.addValue("${v}", forHTTPHeaderField: "${k}")`).join('\n')}
${hasBody ? `request.addValue("application/json", forHTTPHeaderField: "Content-Type")\nrequest.httpBody = """\n${body}\n""".data(using: .utf8)\n` : ''}
let task = URLSession.shared.dataTask(with: request) { data, response, error in
    if let error = error {
        print("Network error: \\(error)")
        return
    }
    guard let httpResponse = response as? HTTPURLResponse else { return }
    print("HTTP Status: \\(httpResponse.statusCode)")

    if let data = data, let output = String(data: data, encoding: .utf8) {
        print("Response: \\(output)")
    }
}
task.resume()`;
}

export function generateRubySnippet(
  url: string,
  method: string = 'GET',
  headers: Record<string, string> = {},
  params: Record<string, string> = {},
  body?: string
): string {
  const fullUrl = buildFullUrl(url, params);
  const hasBody = Boolean(body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase()));

  return `require 'net/http'
require 'uri'
require 'json'

uri = URI.parse('${fullUrl}')
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = (uri.scheme == 'https')
http.read_timeout = 10

request = Net::HTTP::${method.charAt(0).toUpperCase() + method.slice(1).toLowerCase()}.new(uri.request_uri)
${Object.entries(headers).map(([k, v]) => `request['${k}'] = '${v}'`).join('\n')}
${hasBody ? `request['Content-Type'] = 'application/json'\nrequest.body = '${body?.replace(/'/g, "\\'")}'\n` : ''}
response = http.request(request)

puts "Status: #{response.code}"
puts "Response: #{response.body}"`;
}

export function generateSnippetForLanguage(
  lang: SnippetLanguage,
  url: string,
  method: string = 'GET',
  headers: Record<string, string> = {},
  params: Record<string, string> = {},
  body?: string
): string {
  switch (lang) {
    case 'curl':
      return generateCurlSnippet(url, method, headers, params, body);
    case 'js':
      return generateJsSnippet(url, method, headers, params, body);
    case 'axios':
      return generateAxiosSnippet(url, method, headers, params, body);
    case 'ts':
      return generateTypeScriptSnippet(url, method, headers, params, body);
    case 'python':
      return generatePythonSnippet(url, method, headers, params, body);
    case 'python-async':
      return generatePythonHttpxSnippet(url, method, headers, params, body);
    case 'go':
      return generateGoSnippet(url, method, headers, params, body);
    case 'php':
      return generatePhpSnippet(url, method, headers, params, body);
    case 'java':
      return generateJavaSnippet(url, method, headers, params, body);
    case 'csharp':
      return generateCSharpSnippet(url, method, headers, params, body);
    case 'rust':
      return generateRustSnippet(url, method, headers, params, body);
    case 'dart':
      return generateDartSnippet(url, method, headers, params, body);
    case 'swift':
      return generateSwiftSnippet(url, method, headers, params, body);
    case 'ruby':
      return generateRubySnippet(url, method, headers, params, body);
    default:
      return generateCurlSnippet(url, method, headers, params, body);
  }
}
