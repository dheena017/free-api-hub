# Reusable Helpers & Code Generators: `frontend/src/utils`

This directory provides pure helper utilities, formatters, and multi-language code snippet generators.

---

## 🛠️ Utilities Breakdown

### 1. Code Snippet Generator (`codeSnippets.ts`)

Converts an API endpoint configuration (URL, method, headers, query parameters) into copy-paste ready code in multiple languages:

- **cURL**:
  ```bash
  curl -X GET "https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true" \
    -H "Accept: application/json"
  ```
- **JavaScript (`fetch`)**:
  ```javascript
  const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true", {
    method: "GET",
    headers: { "Accept": "application/json" }
  });
  const data = await response.json();
  console.log(data);
  ```
- **Python (`requests`)**:
  ```python
  import requests

  response = requests.get(
      "https://api.open-meteo.com/v1/forecast",
      params={"latitude": "52.52", "longitude": "13.41", "current_weather": "true"},
      headers={"Accept": "application/json"}
  )
  print(response.json())
  ```
- **Go (`net/http`)**:
  ```go
  package main

  import (
      "fmt"
      "io"
      "net/http"
  )

  func main() {
      resp, err := http.Get("https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true")
      if err != nil {
          panic(err)
      }
      defer resp.Body.Close()
      body, _ := io.ReadAll(resp.Body)
      fmt.Println(string(body))
  }
  ```

---

### 2. Formatters & Helpers

- **`formatLatency(ms: number)`**: Formats latency with color thresholds (`< 200ms` green, `< 500ms` amber, `> 500ms` red).
- **`formatDate(isoString: string)`**: Returns humanized relative time strings (e.g. *"5 mins ago"*).
- **`debounce<T>(fn: T, delayMs: number)`**: Utility for debouncing real-time search inputs.
