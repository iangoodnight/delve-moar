// Package cmd contains all Cobra command definitions for the dm CLI.
package cmd

import (
	"fmt"
	"io"
	"os"
	"text/tabwriter"

	"github.com/iangoodnight/delve-moar/cli/internal/apiclient"
)

const defaultAPIURL = "http://localhost:8000"

// newClient builds an API client from DM_API_URL (falls back to localhost).
func newClient() (*apiclient.ClientWithResponses, error) {
	apiURL := os.Getenv("DM_API_URL")
	if apiURL == "" {
		apiURL = defaultAPIURL
	}
	return apiclient.NewClientWithResponses(apiURL)
}

func ptrStr(s string) *string { return &s }
func ptrInt(i int) *int       { return &i }

// tabW wraps a tabwriter.Writer and accumulates the first write error so that
// individual printf/println calls do not need separate error checks. The
// accumulated error (if any) is returned by flush().
type tabW struct {
	w   *tabwriter.Writer
	err error
}

func newTabW(out io.Writer) *tabW {
	return &tabW{w: tabwriter.NewWriter(out, 0, 0, 2, ' ', 0)}
}

func (t *tabW) printf(format string, args ...any) {
	if t.err == nil {
		_, t.err = fmt.Fprintf(t.w, format, args...)
	}
}

func (t *tabW) println(args ...any) {
	if t.err == nil {
		_, t.err = fmt.Fprintln(t.w, args...)
	}
}

// flush flushes the tabwriter and returns the first error encountered during
// writing or flushing, whichever came first.
func (t *tabW) flush() error {
	if t.err != nil {
		return t.err
	}
	return t.w.Flush()
}
