require("dotenv").config();
const { MongoClient } = require("mongodb");

// MongoDB connection string from environment variable
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Error: MONGODB_URI environment variable is not set");
  process.exit(1);
}
const client = new MongoClient(uri);

async function complexMovieAnalysis() {
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas");

    const database = client.db("sample_mflix");
    const movies = database.collection("movies");

    console.log("\n🎬 Running Complex Movie Aggregation Pipeline...\n");

    /**
     * This aggregation pipeline performs advanced analytics:
     * 1. Filters movies from 1990-2020 with valid ratings
     * 2. Unwinds genres and directors for detailed analysis
     * 3. Calculates decade-based statistics
     * 4. Groups by genre and decade
     * 5. Computes weighted scores and rankings
     * 6. Performs multi-level faceted analysis
     * 7. Joins with top directors per genre
     */
    const pipeline = [
      // Stage 1: Filter for quality data (movies with ratings from 1990-2020)
      {
        $match: {
          year: { $gte: 1990, $lte: 2020 },
          "imdb.rating": { $exists: true, $gte: 1 },
          "imdb.votes": { $exists: true, $gte: 100 },
          genres: { $exists: true, $ne: [] },
          directors: { $exists: true, $ne: [] },
          runtime: { $exists: true, $gte: 40 },
        },
      },

      // Stage 2: Add computed fields
      {
        $addFields: {
          decade: {
            $concat: [
              { $toString: { $subtract: ["$year", { $mod: ["$year", 10] }] } },
              "s",
            ],
          },
          // Weighted score combining IMDB rating, votes, and awards
          weightedScore: {
            $add: [
              { $multiply: [{ $ifNull: ["$imdb.rating", 0] }, 10] },
              {
                $divide: [
                  { $log10: { $add: [{ $ifNull: ["$imdb.votes", 0] }, 1] } },
                  2,
                ],
              },
              { $multiply: [{ $ifNull: ["$awards.wins", 0] }, 2] },
              { $ifNull: ["$awards.nominations", 0] },
            ],
          },
          hasMetacritic: { $cond: [{ $ifNull: ["$metacritic", false] }, 1, 0] },
          hasTomatoes: {
            $cond: [{ $ifNull: ["$tomatoes.viewer.rating", false] }, 1, 0],
          },
        },
      },

      // Stage 3: Unwind genres to analyze each genre separately
      {
        $unwind: "$genres",
      },

      // Stage 4: Unwind directors for director analysis
      {
        $unwind: "$directors",
      },

      // Stage 5: Group by genre, decade, and director
      {
        $group: {
          _id: {
            genre: "$genres",
            decade: "$decade",
            director: "$directors",
          },
          movieCount: { $sum: 1 },
          avgRating: { $avg: "$imdb.rating" },
          avgVotes: { $avg: "$imdb.votes" },
          avgWeightedScore: { $avg: "$weightedScore" },
          avgRuntime: { $avg: "$runtime" },
          totalAwards: {
            $sum: {
              $add: [
                { $ifNull: ["$awards.wins", 0] },
                { $ifNull: ["$awards.nominations", 0] },
              ],
            },
          },
          topMovie: { $max: "$imdb.rating" },
          metacriticCount: { $sum: "$hasMetacritic" },
          tomatoesCount: { $sum: "$hasTomatoes" },
          movies: {
            $push: {
              title: "$title",
              year: "$year",
              rating: "$imdb.rating",
              votes: "$imdb.votes",
              score: "$weightedScore",
            },
          },
        },
      },

      // Stage 6: Sort movies within each group by weighted score
      {
        $addFields: {
          movies: {
            $slice: [
              {
                $sortArray: {
                  input: "$movies",
                  sortBy: { score: -1 },
                },
              },
              3, // Keep top 3 movies per director/genre/decade
            ],
          },
        },
      },

      // Stage 7: Group by genre and decade for broader analysis
      {
        $group: {
          _id: {
            genre: "$_id.genre",
            decade: "$_id.decade",
          },
          totalMovies: { $sum: "$movieCount" },
          uniqueDirectors: { $sum: 1 },
          avgRating: { $avg: "$avgRating" },
          avgVotes: { $avg: "$avgVotes" },
          avgWeightedScore: { $avg: "$avgWeightedScore" },
          avgRuntime: { $avg: "$avgRuntime" },
          totalAwards: { $sum: "$totalAwards" },
          topRatedMovie: { $max: "$topMovie" },
          metacriticCoverage: { $sum: "$metacriticCount" },
          tomatoesCoverage: { $sum: "$tomatoesCount" },
          topDirectors: {
            $push: {
              director: "$_id.director",
              movieCount: "$movieCount",
              avgRating: "$avgRating",
              totalAwards: "$totalAwards",
              topMovies: "$movies",
            },
          },
        },
      },

      // Stage 8: Sort directors by movie count and rating
      {
        $addFields: {
          topDirectors: {
            $slice: [
              {
                $sortArray: {
                  input: "$topDirectors",
                  sortBy: { movieCount: -1, avgRating: -1 },
                },
              },
              5, // Top 5 directors per genre/decade
            ],
          },
          coverageScore: {
            $divide: [
              { $add: ["$metacriticCoverage", "$tomatoesCoverage"] },
              { $multiply: ["$totalMovies", 2] },
            ],
          },
        },
      },

      // Stage 9: Faceted aggregation for multi-dimensional analysis
      {
        $facet: {
          // Facet 1: Top genres by decade
          topGenresByDecade: [
            { $sort: { "_id.decade": 1, avgWeightedScore: -1 } },
            {
              $group: {
                _id: "$_id.decade",
                genres: {
                  $push: {
                    genre: "$_id.genre",
                    totalMovies: "$totalMovies",
                    avgRating: "$avgRating",
                    avgWeightedScore: "$avgWeightedScore",
                    uniqueDirectors: "$uniqueDirectors",
                    topDirectors: "$topDirectors",
                  },
                },
              },
            },
            { $sort: { _id: 1 } },
          ],

          // Facet 2: Overall genre statistics
          genreStatistics: [
            {
              $group: {
                _id: "$_id.genre",
                totalMovies: { $sum: "$totalMovies" },
                avgRating: { $avg: "$avgRating" },
                avgWeightedScore: { $avg: "$avgWeightedScore" },
                totalAwards: { $sum: "$totalAwards" },
                decadeCount: { $sum: 1 },
                avgCoverageScore: { $avg: "$coverageScore" },
                peakDecade: {
                  $max: { decade: "$_id.decade", score: "$avgWeightedScore" },
                },
              },
            },
            { $sort: { avgWeightedScore: -1 } },
            { $limit: 20 },
          ],

          // Facet 3: Decade trends
          decadeTrends: [
            {
              $group: {
                _id: "$_id.decade",
                totalMovies: { $sum: "$totalMovies" },
                avgRating: { $avg: "$avgRating" },
                avgWeightedScore: { $avg: "$avgWeightedScore" },
                avgRuntime: { $avg: "$avgRuntime" },
                totalAwards: { $sum: "$totalAwards" },
                genreCount: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],

          // Facet 4: High-quality movies (rating >= 8.0)
          premiumContent: [
            { $match: { topRatedMovie: { $gte: 8.0 } } },
            {
              $project: {
                genre: "$_id.genre",
                decade: "$_id.decade",
                totalMovies: 1,
                avgRating: 1,
                topRatedMovie: 1,
                topDirectors: { $slice: ["$topDirectors", 3] },
              },
            },
            { $sort: { topRatedMovie: -1 } },
            { $limit: 30 },
          ],
        },
      },

      // Stage 10: Add summary statistics
      {
        $addFields: {
          summary: {
            totalDecades: { $size: "$decadeTrends" },
            totalGenres: { $size: "$genreStatistics" },
            analysisDate: new Date(),
            premiumContentCount: { $size: "$premiumContent" },
          },
        },
      },
    ];

    // Execute the aggregation
    const startTime = Date.now();
    const results = await movies.aggregate(pipeline).toArray();
    const executionTime = Date.now() - startTime;

    console.log(`✅ Aggregation completed in ${executionTime}ms\n`);

    // Display results
    if (results.length > 0) {
      const data = results[0];

      console.log(
        "═══════════════════════════════════════════════════════════"
      );
      console.log("📊 SUMMARY STATISTICS");
      console.log(
        "═══════════════════════════════════════════════════════════"
      );
      console.log(`Total Decades Analyzed: ${data.summary.totalDecades}`);
      console.log(`Total Genres: ${data.summary.totalGenres}`);
      console.log(
        `Premium Content Categories: ${data.summary.premiumContentCount}`
      );
      console.log(`Analysis Date: ${data.summary.analysisDate.toISOString()}`);

      console.log(
        "\n═══════════════════════════════════════════════════════════"
      );
      console.log("🏆 TOP 10 GENRES BY WEIGHTED SCORE");
      console.log(
        "═══════════════════════════════════════════════════════════"
      );
      data.genreStatistics.slice(0, 10).forEach((genre, index) => {
        console.log(`\n${index + 1}. ${genre._id.toUpperCase()}`);
        console.log(
          `   Movies: ${
            genre.totalMovies
          } | Avg Rating: ${genre.avgRating.toFixed(2)}`
        );
        console.log(`   Weighted Score: ${genre.avgWeightedScore.toFixed(2)}`);
        console.log(
          `   Total Awards: ${genre.totalAwards} | Decades: ${genre.decadeCount}`
        );
        console.log(
          `   Coverage Score: ${(genre.avgCoverageScore * 100).toFixed(1)}%`
        );
      });

      console.log(
        "\n═══════════════════════════════════════════════════════════"
      );
      console.log("📈 DECADE TRENDS");
      console.log(
        "═══════════════════════════════════════════════════════════"
      );
      data.decadeTrends.forEach((decade) => {
        console.log(`\n${decade._id}:`);
        console.log(
          `   Movies: ${decade.totalMovies} | Genres: ${decade.genreCount}`
        );
        console.log(
          `   Avg Rating: ${decade.avgRating.toFixed(
            2
          )} | Runtime: ${Math.round(decade.avgRuntime)} min`
        );
        console.log(`   Weighted Score: ${decade.avgWeightedScore.toFixed(2)}`);
        console.log(`   Total Awards: ${decade.totalAwards}`);
      });

      console.log(
        "\n═══════════════════════════════════════════════════════════"
      );
      console.log("⭐ TOP PREMIUM CONTENT (Highest Rated)");
      console.log(
        "═══════════════════════════════════════════════════════════"
      );
      data.premiumContent.slice(0, 15).forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.genre} - ${item.decade}`);
        console.log(
          `   Top Rating: ${item.topRatedMovie.toFixed(1)} | Movies: ${
            item.totalMovies
          }`
        );
        console.log(`   Avg Rating: ${item.avgRating.toFixed(2)}`);
        if (item.topDirectors && item.topDirectors.length > 0) {
          console.log(
            `   Top Director: ${item.topDirectors[0].director} (${item.topDirectors[0].movieCount} movies)`
          );
        }
      });

      console.log(
        "\n═══════════════════════════════════════════════════════════"
      );
      console.log("🎭 GENRE EVOLUTION BY DECADE (Sample)");
      console.log(
        "═══════════════════════════════════════════════════════════"
      );
      data.topGenresByDecade.slice(0, 3).forEach((decade) => {
        console.log(`\n${decade._id}:`);
        decade.genres.slice(0, 5).forEach((genre, index) => {
          console.log(
            `  ${index + 1}. ${genre.genre}: ${genre.totalMovies} movies, ` +
              `rating ${genre.avgRating.toFixed(2)}, ` +
              `${genre.uniqueDirectors} directors`
          );
          if (genre.topDirectors && genre.topDirectors.length > 0) {
            console.log(
              `     Top: ${genre.topDirectors[0].director} ` +
                `(${genre.topDirectors[0].movieCount} films, ` +
                `${genre.topDirectors[0].avgRating.toFixed(2)} avg)`
            );
          }
        });
      });

      console.log(
        "\n═══════════════════════════════════════════════════════════"
      );
      console.log("💾 Full results saved to: aggregation-results.json");
      console.log(
        "═══════════════════════════════════════════════════════════\n"
      );

      // Save full results to file
      const fs = require("fs");
      fs.writeFileSync(
        "aggregation-results.json",
        JSON.stringify(results, null, 2),
        "utf-8"
      );
    } else {
      console.log("No results found.");
    }
  } catch (error) {
    console.error("Error running aggregation:", error);
  } finally {
    await client.close();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run the analysis if executed directly
if (require.main === module) {
  complexMovieAnalysis();
}

// Export for use in CLI
module.exports = complexMovieAnalysis;
