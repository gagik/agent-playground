require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Error: MONGODB_URI environment variable is not set');
  process.exit(1);
}

const client = new MongoClient(uri);

async function verifyIndexes() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const mflixDb = client.db('sample_mflix');
    const airbnbDb = client.db('sample_airbnb');

    // Verify movies indexes
    console.log('═══════════════════════════════════════════════════════════');
    console.log('MOVIES COLLECTION INDEXES');
    console.log('═══════════════════════════════════════════════════════════');
    
    const moviesIndexes = await mflixDb.collection('movies').indexes();
    console.log(`\nFound ${moviesIndexes.length} indexes:\n`);
    
    moviesIndexes.forEach((idx, i) => {
      console.log(`${i + 1}. ${idx.name}`);
      console.log('   Keys:', JSON.stringify(idx.key));
      if (idx.partialFilterExpression) {
        console.log('   Partial Filter:', JSON.stringify(idx.partialFilterExpression));
      }
      if (idx.background !== undefined) {
        console.log('   Background:', idx.background);
      }
      console.log('');
    });

    // Check if recommended index exists
    const hasMovieIndex = moviesIndexes.some(idx => idx.name === 'movie_filters_idx');
    if (hasMovieIndex) {
      console.log('✅ Recommended movie index (movie_filters_idx) is present\n');
    } else {
      console.log('⚠️  Recommended movie index (movie_filters_idx) NOT FOUND');
      console.log('   Run: npm run create-indexes\n');
    }

    // Verify Airbnb indexes
    console.log('═══════════════════════════════════════════════════════════');
    console.log('AIRBNB COLLECTION INDEXES');
    console.log('═══════════════════════════════════════════════════════════');
    
    const airbnbIndexes = await airbnbDb.collection('listingsAndReviews').indexes();
    console.log(`\nFound ${airbnbIndexes.length} indexes:\n`);
    
    airbnbIndexes.forEach((idx, i) => {
      console.log(`${i + 1}. ${idx.name}`);
      console.log('   Keys:', JSON.stringify(idx.key));
      if (idx.background !== undefined) {
        console.log('   Background:', idx.background);
      }
      console.log('');
    });

    // Check if recommended index exists
    const hasAirbnbIndex = airbnbIndexes.some(idx => idx.name === 'listing_filters_idx');
    if (hasAirbnbIndex) {
      console.log('✅ Recommended Airbnb index (listing_filters_idx) is present\n');
    } else {
      console.log('⚠️  Recommended Airbnb index (listing_filters_idx) NOT FOUND');
      console.log('   Run: npm run create-indexes\n');
    }

    // Get index statistics
    console.log('═══════════════════════════════════════════════════════════');
    console.log('INDEX USAGE STATISTICS');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Movies Collection:');
    try {
      const movieStats = await mflixDb.collection('movies').aggregate([
        { $indexStats: {} }
      ]).toArray();
      
      movieStats.forEach(stat => {
        console.log(`  • ${stat.name}`);
        console.log(`    Accesses: ${stat.accesses.ops}`);
        console.log(`    Since: ${new Date(stat.accesses.since).toISOString()}`);
      });
    } catch (error) {
      console.log('  ℹ️  Index statistics not available (requires MongoDB 3.2+)');
    }
    console.log('');

    console.log('Airbnb Collection:');
    try {
      const airbnbStats = await airbnbDb.collection('listingsAndReviews').aggregate([
        { $indexStats: {} }
      ]).toArray();
      
      airbnbStats.forEach(stat => {
        console.log(`  • ${stat.name}`);
        console.log(`    Accesses: ${stat.accesses.ops}`);
        console.log(`    Since: ${new Date(stat.accesses.since).toISOString()}`);
      });
    } catch (error) {
      console.log('  ℹ️  Index statistics not available (requires MongoDB 3.2+)');
    }
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Index verification complete');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Summary
    console.log('Summary:');
    console.log(`  Movies indexes: ${moviesIndexes.length} total, ${hasMovieIndex ? '✅' : '❌'} optimized index`);
    console.log(`  Airbnb indexes: ${airbnbIndexes.length} total, ${hasAirbnbIndex ? '✅' : '❌'} optimized index\n`);

  } catch (error) {
    console.error('\n❌ Error verifying indexes:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

// Run if executed directly
if (require.main === module) {
  verifyIndexes();
}

module.exports = verifyIndexes;
