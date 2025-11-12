# MongoDB Analytics CLI

Advanced MongoDB aggregation analysis tool with a powerful command-line interface.

## Features

- 🎬 **Movie Analysis** - Analyze 21,000+ movies with decade trends, genre statistics, and director rankings
- 🏠 **Airbnb Analysis** - Market intelligence for 5,500+ listings with pricing strategies and opportunities
- 🎨 **Beautiful CLI** - Colorful, interactive command-line interface
- 🔒 **Secure** - Uses environment variables for sensitive data
- 📊 **Rich Analytics** - Complex aggregation pipelines with 50+ metrics

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the project root:

```bash
MONGODB_URI=mongodb+srv://your-connection-string
```

## Usage

### Interactive Mode (Recommended)

```bash
node cli.js interactive
# or
node cli.js i
```

### Run Specific Analysis

```bash
# Movie analysis
node cli.js run movies

# Airbnb analysis
node cli.js run airbnb

# Run all analyses
node cli.js run all
```

### NPM Scripts

```bash
# Run movies analysis
npm run movies

# Run Airbnb analysis
npm run airbnb

# Run all analyses
npm run all

# Interactive mode
npm run interactive
```

### List Available Analyses

```bash
node cli.js list
```

### View Connection Info

```bash
node cli.js info
```

### Help

```bash
node cli.js --help
```

## Available Analyses

### 1. Movie Analysis (`movies`)

Analyzes the `sample_mflix.movies` collection (21,349 documents):

- **Decade trends** - Movie production and quality trends across decades
- **Genre statistics** - Top genres by weighted score
- **Director rankings** - Most prolific and highest-rated directors
- **Premium content** - Movies with ratings ≥ 8.0
- **Multi-faceted analysis** - 4 parallel analytical dimensions

**Output:** `aggregation-results.json`

**Pipeline Stages:** 10  
**Metrics:** 50+

### 2. Airbnb Analysis (`airbnb`)

Analyzes the `sample_airbnb.listingsAndReviews` collection (5,555 documents):

- **Market intelligence** - Top markets by size, value, and quality
- **Pricing strategies** - Price segmentation and value scoring
- **Property analysis** - Performance by type and tier
- **Market opportunities** - Low competition, high potential markets
- **Booking potential** - Predictive metrics for success

**Output:** `airbnb-analysis-results.json`

**Pipeline Stages:** 10  
**Metrics:** 50+

## Performance Optimization

This project includes comprehensive MongoDB performance analysis and optimization tools.

### Performance Analysis Report

See [`PERFORMANCE_ANALYSIS.md`](./PERFORMANCE_ANALYSIS.md) for detailed:
- Database and collection statistics
- Query performance metrics
- Index usage analysis
- Optimization recommendations
- Before/after comparisons

### Create Performance Indexes

To optimize query performance (40-56% improvement), run:

```bash
npm run create-indexes
```

This creates compound indexes for:
- **Movies:** `{year, imdb.rating, imdb.votes, runtime}`
- **Airbnb:** `{number_of_reviews, review_scores.review_scores_rating, bedrooms}`

### Verify Indexes

Check index status and usage:

```bash
npm run verify-indexes
```

**Note:** Creating indexes is optional but highly recommended for:
- Better performance on large datasets
- Faster query execution times
- Scalability as data grows

## Architecture

### Scripts

- `complex-movie-aggregation.js` - Movie analysis aggregation pipeline
- `airbnb-market-analysis.js` - Airbnb market analysis pipeline
- `cli.js` - Command-line interface

### Technologies

- **MongoDB Node.js Driver** - Database connectivity
- **Commander.js** - CLI framework
- **Inquirer.js** - Interactive prompts
- **Chalk** - Terminal styling
- **Ora** - Loading spinners
- **Figlet** - ASCII art
- **dotenv** - Environment variable management

## Advanced Features

### Weighted Scoring Algorithm

Both analyses use custom scoring algorithms:

**Movie Score:**
```
weightedScore = (imdb.rating × 10) + 
                (log10(votes + 1) / 2) + 
                (awards.wins × 2) + 
                awards.nominations
```

**Airbnb Value Score:**
```
valueScore = (reviewQuality / sqrt(price + 1)) × 100
```

**Booking Potential:**
```
bookingPotential = (availability/30) × (quality/100) × 
                   superhostBonus × (reviews/100)
```

### Faceted Aggregation

Each analysis uses MongoDB's `$facet` stage to run multiple parallel aggregations:

- **Movies:** 4 facets (genre trends, statistics, decade analysis, premium content)
- **Airbnb:** 6 facets (top markets, value markets, premium markets, opportunities, property analysis, global stats)

## Output Files

Both analyses generate detailed JSON output files:

- `aggregation-results.json` - Movie analysis results
- `airbnb-analysis-results.json` - Airbnb analysis results

These files contain the complete analysis results and can be imported into BI tools or further processed.

## Examples

### Run movie analysis with colorful output

```bash
node cli.js run movies
```

### Interactive mode - choose your analysis

```bash
node cli.js interactive
```

### Run everything

```bash
npm run all
```

## Requirements

- Node.js 14+
- MongoDB Atlas account or MongoDB instance
- Connection to sample databases (sample_mflix, sample_airbnb)

## Security

- Never commit `.env` file to version control
- Connection strings are masked in CLI output
- Use read-only database users for safety

## License

ISC
