package cmd

import (
	"context"
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"github.com/iangoodnight/delve-moar/cli/internal/apiclient"
)

// ---------------------------------------------------------------------------
// Flags
// ---------------------------------------------------------------------------

var itemListOpts struct {
	category string
	rarity   string
	search   string
	orderBy  string
	limit    int
	offset   int
}

var itemGetOpts struct {
	namespace string
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

var itemCmd = &cobra.Command{
	Use:   "item",
	Short: "Look up items from the SRD catalog",
}

var itemListCmd = &cobra.Command{
	Use:   "list",
	Short: "List items with optional filters",
	RunE:  runItemList,
}

var itemGetCmd = &cobra.Command{
	Use:   "get <slug>",
	Short: "Get full details for an item by slug",
	Args:  cobra.ExactArgs(1),
	RunE:  runItemGet,
}

func init() {
	itemListCmd.Flags().StringVar(&itemListOpts.category, "category", "", "Exact match on item category (e.g. 'weapon')")
	itemListCmd.Flags().StringVar(&itemListOpts.rarity, "rarity", "", "Exact match on item rarity (e.g. 'rare'). Use 'none' for items with no rarity.")
	itemListCmd.Flags().StringVar(&itemListOpts.search, "search", "", "Case-insensitive substring search on name and category")
	itemListCmd.Flags().StringVar(&itemListOpts.orderBy, "order-by", "", "Sort order, e.g. 'name:asc' or 'rarity:desc,name:asc'")
	itemListCmd.Flags().IntVar(&itemListOpts.limit, "limit", 20, "Maximum number of results to return")
	itemListCmd.Flags().IntVar(&itemListOpts.offset, "offset", 0, "Number of results to skip")

	itemGetCmd.Flags().StringVar(&itemGetOpts.namespace, "namespace", "", "Source namespace (default: srd-5.1)")

	itemCmd.AddCommand(itemListCmd, itemGetCmd)
	rootCmd.AddCommand(itemCmd)
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

func runItemList(cmd *cobra.Command, _ []string) error {
	client, err := newClient()
	if err != nil {
		return fmt.Errorf("creating API client: %w", err)
	}

	params := &apiclient.ListItemsV1ItemsGetParams{
		Limit:  ptrInt(itemListOpts.limit),
		Offset: ptrInt(itemListOpts.offset),
	}
	if cmd.Flags().Changed("category") {
		params.ItemCategory = ptrStr(itemListOpts.category)
	}
	if cmd.Flags().Changed("rarity") {
		params.Rarity = ptrStr(itemListOpts.rarity)
	}
	if cmd.Flags().Changed("search") {
		params.Search = ptrStr(itemListOpts.search)
	}
	if cmd.Flags().Changed("order-by") {
		params.OrderBy = ptrStr(itemListOpts.orderBy)
	}

	resp, err := client.ListItemsV1ItemsGetWithResponse(context.Background(), params)
	if err != nil {
		return fmt.Errorf("calling API: %w", err)
	}
	if resp.JSON200 == nil {
		if resp.JSON422 != nil {
			return fmt.Errorf("validation error: %s", resp.JSON422.UserMessage)
		}
		return fmt.Errorf("unexpected status %s", resp.Status())
	}

	data := resp.JSON200.Data
	meta := resp.JSON200.Metadata.Resultset

	if meta.Count == 0 {
		fmt.Println("No items found.")
		return nil
	}

	w := newTabW(os.Stdout)
	w.println("NAME\tCATEGORY\tRARITY")
	for _, it := range data {
		cat := "-"
		if it.ItemCategory != nil {
			cat = *it.ItemCategory
		}
		rarity := "-"
		if it.Rarity != nil {
			rarity = *it.Rarity
		}
		w.printf("%s\t%s\t%s\n", it.Name, cat, rarity)
	}
	if err := w.flush(); err != nil {
		return fmt.Errorf("writing output: %w", err)
	}

	start := meta.Offset + 1
	end := meta.Offset + len(data)
	fmt.Printf("\nShowing %d\u2013%d of %d\n", start, end, meta.Count)
	return nil
}

func runItemGet(_ *cobra.Command, args []string) error {
	client, err := newClient()
	if err != nil {
		return fmt.Errorf("creating API client: %w", err)
	}

	slug := args[0]
	params := &apiclient.GetItemV1ItemsSlugGetParams{}
	if itemGetOpts.namespace != "" {
		params.Namespace = ptrStr(itemGetOpts.namespace)
	}

	resp, err := client.GetItemV1ItemsSlugGetWithResponse(context.Background(), slug, params)
	if err != nil {
		return fmt.Errorf("calling API: %w", err)
	}
	if resp.JSON404 != nil {
		fmt.Fprintf(os.Stderr, "error: %s\n", resp.JSON404.UserMessage)
		os.Exit(1)
	}
	if resp.JSON200 == nil {
		return fmt.Errorf("unexpected status %s", resp.Status())
	}

	it := resp.JSON200
	cat := "-"
	if it.ItemCategory != nil {
		cat = *it.ItemCategory
	}
	rarity := "-"
	if it.Rarity != nil {
		rarity = *it.Rarity
	}

	w := newTabW(os.Stdout)
	w.printf("%s\n", it.Name)
	w.printf("Slug:\t%s\n", it.Slug)
	w.printf("Category:\t%s\n", cat)
	w.printf("Rarity:\t%s\n", rarity)
	if err := w.flush(); err != nil {
		return fmt.Errorf("writing output: %w", err)
	}

	return nil
}
