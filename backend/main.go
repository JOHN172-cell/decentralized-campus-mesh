package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync/atomic"
	"time"
)

type Peer struct {
	NodeID   string    `json:"nodeId"`
	IP       string    `json:"ip"`
	Port     int       `json:"port"`
	LastSeen time.Time `json:"lastSeen"`
	Status   string    `json:"status"`
	Role     string    `json:"role"`
	Signal   int       `json:"signal"`
}

type MeshFile struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	SizeBytes   int64  `json:"sizeBytes"`
	ChunkCount  int    `json:"chunkCount"`
	Type        string `json:"type"`
	Seeders     int    `json:"seeders"`
	UpdatedAt   string `json:"updatedAt"`
}

type Stats struct {
	TotalBytesTransferred int64 `json:"totalBytesTransferred"`
	GatewayHitsAvoided    int64 `json:"gatewayHitsAvoided"`
	ActivePeers           int   `json:"activePeers"`
	CatalogFiles          int   `json:"catalogFiles"`
	UptimeSeconds         int64 `json:"uptimeSeconds"`
}

var startedAt = time.Now()
var totalBytesTransferred int64 = 2847392012
var gatewayHitsAvoided int64 = 18429

var peers = []Peer{
	{NodeID: "NODE-A7F2", IP: "10.24.8.17", Port: 8080, LastSeen: time.Now().Add(-2 * time.Second), Status: "online", Role: "relay", Signal: 94},
	{NodeID: "NODE-C31B", IP: "10.24.8.23", Port: 8080, LastSeen: time.Now().Add(-7 * time.Second), Status: "online", Role: "student", Signal: 81},
	{NodeID: "NODE-F904", IP: "10.24.8.31", Port: 8080, LastSeen: time.Now().Add(-12 * time.Second), Status: "online", Role: "library", Signal: 76},
	{NodeID: "NODE-1D6E", IP: "10.24.8.44", Port: 8080, LastSeen: time.Now().Add(-36 * time.Second), Status: "syncing", Role: "student", Signal: 62},
	{NodeID: "NODE-B82C", IP: "10.24.8.52", Port: 8080, LastSeen: time.Now().Add(-2 * time.Minute), Status: "idle", Role: "research", Signal: 48},
}

var files = []MeshFile{
	{ID: "res-001", Name: "Distributed Systems / Lecture 07", Description: "Consensus, replication & fault tolerance", SizeBytes: 48234496, ChunkCount: 18, Type: "PDF", Seeders: 12, UpdatedAt: "4 min ago"},
	{ID: "res-002", Name: "Computer Networks / Routing Lab", Description: "BGP, OSPF and mesh routing exercises", SizeBytes: 134217728, ChunkCount: 49, Type: "ZIP", Seeders: 8, UpdatedAt: "11 min ago"},
	{ID: "res-003", Name: "Operating Systems / Kernel Notes", Description: "Memory management and scheduling", SizeBytes: 16777216, ChunkCount: 7, Type: "PDF", Seeders: 21, UpdatedAt: "26 min ago"},
	{ID: "res-004", Name: "Research Methods / Citation Pack", Description: "Open access papers for capstone research", SizeBytes: 79691776, ChunkCount: 29, Type: "ZIP", Seeders: 5, UpdatedAt: "1 hr ago"},
	{ID: "res-005", Name: "Campus Mesh / Quickstart Guide", Description: "Join the local content mesh in five minutes", SizeBytes: 6291456, ChunkCount: 3, Type: "PDF", Seeders: 34, UpdatedAt: "2 hrs ago"},
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/", handleRoot)
	mux.HandleFunc("/api/peers", handlePeers)
	mux.HandleFunc("/api/files", handleFiles)
	mux.HandleFunc("/api/stats", handleStats)
	mux.HandleFunc("/api/files/", handleDownload)
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	server := &http.Server{Addr: ":8080", Handler: cors(logging(mux))}
	log.Println("DCCRM mesh API listening on http://localhost:8080")
	log.Fatal(server.ListenAndServe())
}

func handleRoot(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"name":    "DCCRM mesh API",
		"status":  "ok",
		"version": "0.1.0",
		"endpoints": []string{
			"/api/health",
			"/api/peers",
			"/api/files",
			"/api/stats",
			"/api/files/:id/download",
		},
	})
}

func handlePeers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"peers": peers, "count": len(peers)})
}

func handleFiles(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"files": files, "count": len(files)})
}

func handleStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	writeJSON(w, http.StatusOK, Stats{
		TotalBytesTransferred: atomic.LoadInt64(&totalBytesTransferred),
		GatewayHitsAvoided:    atomic.LoadInt64(&gatewayHitsAvoided),
		ActivePeers:           len(peers), CatalogFiles: len(files), UptimeSeconds: int64(time.Since(startedAt).Seconds()),
	})
}

func handleDownload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id := strings.TrimPrefix(r.URL.Path, "/api/files/")
	for _, file := range files {
		if file.ID == id {
			atomic.AddInt64(&totalBytesTransferred, file.SizeBytes)
			atomic.AddInt64(&gatewayHitsAvoided, 1)
			w.Header().Set("Content-Disposition", `attachment; filename="`+strings.ReplaceAll(file.Name, "/", "-")+`.txt"`)
			w.Header().Set("Content-Type", "text/plain; charset=utf-8")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte("DCCRM local mesh transfer\n\nResource: " + file.Name + "\nNode: local-campus-mesh\nSize: " + strconv.FormatInt(file.SizeBytes, 10) + " bytes\n"))
			return
		}
	}
	http.Error(w, "file not found", http.StatusNotFound)
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(started).Round(time.Millisecond))
	})
}
