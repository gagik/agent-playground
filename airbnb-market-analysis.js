require("dotenv").config();
const { MongoClient } = require("mongodb");

// MongoDB connection string from environment variable
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Error: MONGODB_URI environment variable is not set");
  process.exit(1);
}
const client = new MongoClient(uri);

async function complexAirbnbAnalysis() {
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas");

    const database = client.db("sample_airbnb");
    const listings = database.collection("listingsAndReviews");

    console.log("\n🏠 Running Complex Airbnb Market Analysis Pipeline...\n");

    /**
     * This aggregation pipeline performs comprehensive market analysis:
     * 1. Data cleansing and validation
     * 2. Price normalization and segmentation
     * 3. Geographic market analysis
     * 4. Host performance metrics
     * 5. Property type comparisons
     * 6. Amenity correlation analysis
     * 7. Review sentiment and quality metrics
     * 8. Seasonal availability patterns
     * 9. Pricing strategy recommendations
     * 10. Multi-dimensional market segmentation
     */
    const pipeline = [
      // Stage 1: Filter for quality listings with reviews and pricing
      {
        $match: {
          number_of_reviews: { $gte: 5 },
          price: { $exists: true, $ne: null },
          bedrooms: { $exists: true, $gte: 0 },
          "address.market": { $exists: true },
          "address.country": { $exists: true },
          "review_scores.review_scores_rating": { $exists: true },
        },
      },

      // Stage 2: Add computed fields and data transformations
      {
        $addFields: {
          // Convert Decimal128 to double for calculations
          priceNumeric: { $toDouble: "$price" },
          cleaningFeeNumeric: { $toDouble: { $ifNull: ["$cleaning_fee", 0] } },
          extraPeopleNumeric: { $toDouble: { $ifNull: ["$extra_people", 0] } },
          securityDepositNumeric: {
            $toDouble: { $ifNull: ["$security_deposit", 0] },
          },

          // Price segmentation
          pricePerBed: {
            $cond: [
              { $gt: ["$beds", 0] },
              { $divide: [{ $toDouble: "$price" }, "$beds"] },
              { $toDouble: "$price" },
            ],
          },

          pricePerPerson: {
            $cond: [
              { $gt: ["$accommodates", 0] },
              { $divide: [{ $toDouble: "$price" }, "$accommodates"] },
              { $toDouble: "$price" },
            ],
          },

          // Total cost calculation
          totalBaseCost: {
            $add: [
              { $toDouble: "$price" },
              { $toDouble: { $ifNull: ["$cleaning_fee", 0] } },
            ],
          },

          // Property size score
          propertyScore: {
            $add: [
              { $multiply: [{ $ifNull: ["$bedrooms", 0] }, 30] },
              { $multiply: [{ $ifNull: ["$beds", 0] }, 15] },
              {
                $multiply: [{ $toDouble: { $ifNull: ["$bathrooms", 0] } }, 20],
              },
              { $multiply: ["$accommodates", 10] },
            ],
          },

          // Review quality metrics
          reviewQuality: {
            $avg: [
              { $ifNull: ["$review_scores.review_scores_accuracy", 0] },
              { $ifNull: ["$review_scores.review_scores_cleanliness", 0] },
              { $ifNull: ["$review_scores.review_scores_checkin", 0] },
              { $ifNull: ["$review_scores.review_scores_communication", 0] },
              { $ifNull: ["$review_scores.review_scores_location", 0] },
              { $ifNull: ["$review_scores.review_scores_value", 0] },
            ],
          },

          // Host quality indicators
          isSuperhostVerified: {
            $and: [
              { $eq: [{ $ifNull: ["$host.host_is_superhost", false] }, true] },
              {
                $eq: [
                  { $ifNull: ["$host.host_identity_verified", false] },
                  true,
                ],
              },
            ],
          },

          // Amenity richness
          amenityCount: { $size: { $ifNull: ["$amenities", []] } },

          // Availability score
          avgAvailability: {
            $avg: [
              { $ifNull: ["$availability.availability_30", 0] },
              {
                $divide: [{ $ifNull: ["$availability.availability_60", 0] }, 2],
              },
              {
                $divide: [{ $ifNull: ["$availability.availability_90", 0] }, 3],
              },
              {
                $divide: [
                  { $ifNull: ["$availability.availability_365", 0] },
                  12,
                ],
              },
            ],
          },

          // Price tier
          priceTier: {
            $switch: {
              branches: [
                {
                  case: { $lte: [{ $toDouble: "$price" }, 75] },
                  then: "Budget",
                },
                {
                  case: { $lte: [{ $toDouble: "$price" }, 150] },
                  then: "Mid-Range",
                },
                {
                  case: { $lte: [{ $toDouble: "$price" }, 300] },
                  then: "Premium",
                },
                {
                  case: { $gt: [{ $toDouble: "$price" }, 300] },
                  then: "Luxury",
                },
              ],
              default: "Unknown",
            },
          },
        },
      },

      // Stage 3: Add value score (price vs. quality ratio)
      {
        $addFields: {
          valueScore: {
            $multiply: [
              {
                $divide: [
                  "$reviewQuality",
                  { $add: [{ $sqrt: "$priceNumeric" }, 1] },
                ],
              },
              100,
            ],
          },

          // Calculate booking potential
          bookingPotential: {
            $multiply: [
              { $divide: ["$avgAvailability", 30] }, // Availability factor
              { $divide: ["$reviewQuality", 100] }, // Quality factor
              { $cond: ["$isSuperhostVerified", 1.3, 1] }, // Superhost bonus
              { $divide: [{ $add: ["$number_of_reviews", 10] }, 100] }, // Reviews factor
            ],
          },
        },
      },

      // Stage 4: Unwind amenities for detailed analysis
      {
        $unwind: {
          path: "$amenities",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Stage 5: Group by market, property type, and price tier
      {
        $group: {
          _id: {
            market: "$address.market",
            country: "$address.country",
            propertyType: "$property_type",
            roomType: "$room_type",
            priceTier: "$priceTier",
          },

          // Count and basic stats
          listingCount: { $sum: 1 },
          uniqueHosts: { $addToSet: "$host.host_id" },

          // Price metrics
          avgPrice: { $avg: "$priceNumeric" },
          minPrice: { $min: "$priceNumeric" },
          maxPrice: { $max: "$priceNumeric" },
          medianPrice: {
            $median: { input: "$priceNumeric", method: "approximate" },
          },
          avgPricePerBed: { $avg: "$pricePerBed" },
          avgPricePerPerson: { $avg: "$pricePerPerson" },
          avgTotalCost: { $avg: "$totalBaseCost" },

          // Property characteristics
          avgBedrooms: { $avg: "$bedrooms" },
          avgBeds: { $avg: "$beds" },
          avgAccommodates: { $avg: "$accommodates" },
          avgPropertyScore: { $avg: "$propertyScore" },

          // Quality metrics
          avgReviewRating: { $avg: "$review_scores.review_scores_rating" },
          avgReviewQuality: { $avg: "$reviewQuality" },
          avgReviewCount: { $avg: "$number_of_reviews" },
          totalReviews: { $sum: "$number_of_reviews" },

          // Host metrics
          superhostCount: { $sum: { $cond: ["$isSuperhostVerified", 1, 0] } },
          avgHostListings: { $avg: "$host.host_total_listings_count" },

          // Amenities
          topAmenities: { $push: "$amenities" },
          avgAmenityCount: { $avg: "$amenityCount" },

          // Availability
          avgAvailability: { $avg: "$avgAvailability" },

          // Value metrics
          avgValueScore: { $avg: "$valueScore" },
          avgBookingPotential: { $avg: "$bookingPotential" },

          // Fees
          avgCleaningFee: { $avg: "$cleaningFeeNumeric" },
          avgSecurityDeposit: { $avg: "$securityDepositNumeric" },
        },
      },

      // Stage 6: Process amenities to find most common ones
      {
        $addFields: {
          topAmenities: {
            $slice: [
              {
                $map: {
                  input: {
                    $sortArray: {
                      input: {
                        $reduce: {
                          input: "$topAmenities",
                          initialValue: [],
                          in: {
                            $concatArrays: [
                              "$$value",
                              {
                                $cond: [
                                  { $in: ["$$this", "$$value.amenity"] },
                                  [],
                                  [{ amenity: "$$this", count: 1 }],
                                ],
                              },
                            ],
                          },
                        },
                      },
                      sortBy: { count: -1 },
                    },
                  },
                  as: "am",
                  in: "$$am.amenity",
                },
              },
              10,
            ],
          },
          uniqueHostCount: { $size: "$uniqueHosts" },
          superhostPercentage: {
            $multiply: [{ $divide: ["$superhostCount", "$listingCount"] }, 100],
          },
        },
      },

      // Stage 7: Group by market for market-level analysis
      {
        $group: {
          _id: {
            market: "$_id.market",
            country: "$_id.country",
          },

          // Market summary
          totalListings: { $sum: "$listingCount" },
          totalHosts: { $sum: "$uniqueHostCount" },
          totalReviews: { $sum: "$totalReviews" },

          // Market price ranges
          marketAvgPrice: { $avg: "$avgPrice" },
          marketMinPrice: { $min: "$minPrice" },
          marketMaxPrice: { $max: "$maxPrice" },
          priceVariance: { $stdDevPop: "$avgPrice" },

          // Market characteristics
          propertyTypesOffered: { $sum: 1 },
          avgMarketQuality: { $avg: "$avgReviewQuality" },
          avgMarketRating: { $avg: "$avgReviewRating" },

          // Property type breakdown
          propertySegments: {
            $push: {
              propertyType: "$_id.propertyType",
              roomType: "$_id.roomType",
              priceTier: "$_id.priceTier",
              count: "$listingCount",
              avgPrice: "$avgPrice",
              avgRating: "$avgReviewRating",
              avgValueScore: "$avgValueScore",
              avgBookingPotential: "$avgBookingPotential",
              superhostPct: "$superhostPercentage",
              topAmenities: { $slice: ["$topAmenities", 5] },
            },
          },

          // Aggregated metrics
          avgSuperhostRate: { $avg: "$superhostPercentage" },
          avgAvailability: { $avg: "$avgAvailability" },
          marketValueScore: { $avg: "$avgValueScore" },
          marketBookingPotential: { $avg: "$avgBookingPotential" },
        },
      },

      // Stage 8: Calculate market rankings and insights
      {
        $addFields: {
          // Sort property segments by booking potential
          propertySegments: {
            $sortArray: {
              input: "$propertySegments",
              sortBy: { avgBookingPotential: -1 },
            },
          },

          // Market competitiveness score
          competitivenessScore: {
            $multiply: [
              { $divide: ["$totalListings", { $add: ["$totalHosts", 1] }] },
              { $divide: ["$avgMarketQuality", 10] },
            ],
          },

          // Price-to-quality ratio for market
          marketPQRatio: {
            $divide: [
              "$avgMarketQuality",
              { $add: [{ $sqrt: "$marketAvgPrice" }, 1] },
            ],
          },
        },
      },

      // Stage 9: Faceted aggregation for comprehensive analysis
      {
        $facet: {
          // Facet 1: Top markets by various metrics
          topMarkets: [
            {
              $project: {
                market: "$_id.market",
                country: "$_id.country",
                totalListings: 1,
                totalHosts: 1,
                totalReviews: 1,
                avgPrice: "$marketAvgPrice",
                avgRating: "$avgMarketRating",
                competitivenessScore: 1,
                valueScore: "$marketValueScore",
                bookingPotential: "$marketBookingPotential",
                superhostRate: "$avgSuperhostRate",
                propertyTypesOffered: 1,
              },
            },
            { $sort: { totalListings: -1 } },
            { $limit: 20 },
          ],

          // Facet 2: Best value markets
          bestValueMarkets: [
            {
              $project: {
                market: "$_id.market",
                country: "$_id.country",
                avgPrice: "$marketAvgPrice",
                avgRating: "$avgMarketRating",
                valueScore: "$marketValueScore",
                pqRatio: "$marketPQRatio",
                totalListings: 1,
              },
            },
            { $sort: { valueScore: -1 } },
            { $limit: 15 },
          ],

          // Facet 3: Premium markets (highest quality)
          premiumMarkets: [
            {
              $match: { avgMarketRating: { $gte: 90 } },
            },
            {
              $project: {
                market: "$_id.market",
                country: "$_id.country",
                avgPrice: "$marketAvgPrice",
                avgRating: "$avgMarketRating",
                superhostRate: "$avgSuperhostRate",
                totalListings: 1,
                competitivenessScore: 1,
              },
            },
            { $sort: { avgRating: -1 } },
          ],

          // Facet 4: Market opportunities (low competition, high potential)
          opportunityMarkets: [
            {
              $match: {
                competitivenessScore: { $lte: 2 },
                marketBookingPotential: { $gte: 0.1 },
              },
            },
            {
              $project: {
                market: "$_id.market",
                country: "$_id.country",
                totalListings: 1,
                avgPrice: "$marketAvgPrice",
                competitivenessScore: 1,
                bookingPotential: "$marketBookingPotential",
                propertyTypesOffered: 1,
              },
            },
            { $sort: { bookingPotential: -1 } },
            { $limit: 10 },
          ],

          // Facet 5: Detailed property segment analysis
          propertyAnalysis: [
            { $unwind: "$propertySegments" },
            {
              $group: {
                _id: {
                  propertyType: "$propertySegments.propertyType",
                  priceTier: "$propertySegments.priceTier",
                },
                marketCount: { $sum: 1 },
                totalListings: { $sum: "$propertySegments.count" },
                avgPrice: { $avg: "$propertySegments.avgPrice" },
                avgRating: { $avg: "$propertySegments.avgRating" },
                avgValueScore: { $avg: "$propertySegments.avgValueScore" },
                avgBookingPotential: {
                  $avg: "$propertySegments.avgBookingPotential",
                },
                avgSuperhostRate: { $avg: "$propertySegments.superhostPct" },
              },
            },
            { $sort: { totalListings: -1 } },
            { $limit: 25 },
          ],

          // Facet 6: Overall statistics
          globalStats: [
            {
              $group: {
                _id: null,
                totalMarkets: { $sum: 1 },
                totalListings: { $sum: "$totalListings" },
                totalHosts: { $sum: "$totalHosts" },
                totalReviews: { $sum: "$totalReviews" },
                globalAvgPrice: { $avg: "$marketAvgPrice" },
                globalAvgRating: { $avg: "$avgMarketRating" },
                avgListingsPerMarket: { $avg: "$totalListings" },
                avgHostsPerMarket: { $avg: "$totalHosts" },
              },
            },
          ],
        },
      },

      // Stage 10: Add final summary
      {
        $addFields: {
          analysisMetadata: {
            timestamp: new Date(),
            pipelineStages: 10,
            facetsAnalyzed: 6,
            metricsCalculated: 50,
          },
        },
      },
    ];

    // Execute the aggregation
    const startTime = Date.now();
    const results = await listings.aggregate(pipeline).toArray();
    const executionTime = Date.now() - startTime;

    console.log(`✅ Aggregation completed in ${executionTime}ms\n`);

    // Display results
    if (results.length > 0) {
      const data = results[0];

      console.log(
        "═══════════════════════════════════════════════════════════"
      );
      console.log("🌍 GLOBAL STATISTICS");
      console.log(
        "═══════════════════════════════════════════════════════════"
      );
      const global = data.globalStats[0];
      console.log(`Total Markets: ${global.totalMarkets}`);
      console.log(`Total Listings: ${global.totalListings.toLocaleString()}`);
      console.log(`Total Hosts: ${global.totalHosts.toLocaleString()}`);
      console.log(`Total Reviews: ${global.totalReviews.toLocaleString()}`);
      console.log(`Global Avg Price: $${global.globalAvgPrice.toFixed(2)}`);
      console.log(
        `Global Avg Rating: ${global.globalAvgRating.toFixed(2)}/100`
      );
      console.log(
        `Avg Listings/Market: ${Math.round(global.avgListingsPerMarket)}`
      );

      console.log(
        "\n═══════════════════════════════════════════════════════════"
      );
      console.log("🏆 TOP 10 MARKETS BY SIZE");
      console.log(
        "═══════════════════════════════════════════════════════════"
      );
      data.topMarkets.slice(0, 10).forEach((market, index) => {
        console.log(`\n${index + 1}. ${market.market}, ${market.country}`);
        console.log(
          `   Listings: ${market.totalListings.toLocaleString()} | ` +
            `Hosts: ${market.totalHosts.toLocaleString()} | ` +
            `Reviews: ${market.totalReviews.toLocaleString()}`
        );
        console.log(
          `   Avg Price: $${market.avgPrice.toFixed(2)} | ` +
            `Rating: ${market.avgRating.toFixed(1)}`
        );
        console.log(
          `   Superhost Rate: ${market.superhostRate.toFixed(1)}% | ` +
            `Property Types: ${market.propertyTypesOffered}`
        );
        console.log(
          `   Competitiveness: ${market.competitivenessScore.toFixed(2)} | ` +
            `Booking Potential: ${(market.bookingPotential * 100).toFixed(1)}%`
        );
      });

      console.log(
        "\n═══════════════════════════════════════════════════════════"
      );
      console.log("💎 TOP 10 BEST VALUE MARKETS");
      console.log(
        "═══════════════════════════════════════════════════════════"
      );
      data.bestValueMarkets.slice(0, 10).forEach((market, index) => {
        console.log(`\n${index + 1}. ${market.market}, ${market.country}`);
        console.log(
          `   Value Score: ${market.valueScore.toFixed(2)} | ` +
            `P/Q Ratio: ${market.pqRatio.toFixed(2)}`
        );
        console.log(
          `   Avg Price: $${market.avgPrice.toFixed(2)} | ` +
            `Rating: ${market.avgRating.toFixed(1)}`
        );
        console.log(`   Listings: ${market.totalListings}`);
      });

      if (data.premiumMarkets.length > 0) {
        console.log(
          "\n═══════════════════════════════════════════════════════════"
        );
        console.log("⭐ PREMIUM MARKETS (Rating ≥ 90)");
        console.log(
          "═══════════════════════════════════════════════════════════"
        );
        data.premiumMarkets.slice(0, 10).forEach((market, index) => {
          console.log(`\n${index + 1}. ${market.market}, ${market.country}`);
          console.log(
            `   Rating: ${market.avgRating.toFixed(2)} | ` +
              `Avg Price: $${market.avgPrice.toFixed(2)}`
          );
          console.log(
            `   Superhost Rate: ${market.superhostRate.toFixed(1)}% | ` +
              `Listings: ${market.totalListings}`
          );
          console.log(
            `   Competitiveness: ${market.competitivenessScore.toFixed(2)}`
          );
        });
      }

      if (data.opportunityMarkets.length > 0) {
        console.log(
          "\n═══════════════════════════════════════════════════════════"
        );
        console.log("🎯 MARKET OPPORTUNITIES (Low Competition)");
        console.log(
          "═══════════════════════════════════════════════════════════"
        );
        data.opportunityMarkets.forEach((market, index) => {
          console.log(`\n${index + 1}. ${market.market}, ${market.country}`);
          console.log(
            `   Listings: ${market.totalListings} | ` +
              `Property Types: ${market.propertyTypesOffered}`
          );
          console.log(
            `   Competitiveness: ${market.competitivenessScore.toFixed(2)} | ` +
              `Booking Potential: ${(market.bookingPotential * 100).toFixed(
                1
              )}%`
          );
          console.log(`   Avg Price: $${market.avgPrice.toFixed(2)}`);
        });
      }

      console.log(
        "\n═══════════════════════════════════════════════════════════"
      );
      console.log("🏘️  TOP 15 PROPERTY TYPE/TIER COMBINATIONS");
      console.log(
        "═══════════════════════════════════════════════════════════"
      );
      data.propertyAnalysis.slice(0, 15).forEach((prop, index) => {
        console.log(
          `\n${index + 1}. ${prop._id.propertyType} (${prop._id.priceTier})`
        );
        console.log(
          `   Listings: ${prop.totalListings.toLocaleString()} across ${
            prop.marketCount
          } markets`
        );
        console.log(
          `   Avg Price: $${prop.avgPrice.toFixed(2)} | ` +
            `Rating: ${prop.avgRating.toFixed(1)}`
        );
        console.log(
          `   Value Score: ${prop.avgValueScore.toFixed(2)} | ` +
            `Booking Potential: ${(prop.avgBookingPotential * 100).toFixed(1)}%`
        );
        console.log(`   Superhost Rate: ${prop.avgSuperhostRate.toFixed(1)}%`);
      });

      console.log(
        "\n═══════════════════════════════════════════════════════════"
      );
      console.log(
        `📊 Analysis completed at ${data.analysisMetadata.timestamp.toISOString()}`
      );
      console.log(`Pipeline stages: ${data.analysisMetadata.pipelineStages}`);
      console.log(
        `Metrics calculated: ${data.analysisMetadata.metricsCalculated}+`
      );
      console.log(
        "═══════════════════════════════════════════════════════════"
      );

      console.log("\n💾 Full results saved to: airbnb-analysis-results.json\n");

      // Save full results to file
      const fs = require("fs");
      fs.writeFileSync(
        "airbnb-analysis-results.json",
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
    console.log("🔌 Disconnected from MongoDB\n");
  }
}

// Run the analysis if executed directly
if (require.main === module) {
  complexAirbnbAnalysis();
}

// Export for use in CLI
module.exports = complexAirbnbAnalysis;
