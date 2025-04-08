const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const path = require('path');
const { ObjectId } = require('mongodb');
const app = express();
app.use(express.json());
app.set('port', 3000);

function logActivity(activity, details = "") {
    const time = new Date();
    const formattedTime = time.toLocaleString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  
    const logMessage = `[${formattedTime}] ${activity}${details ? ` | ${details}` : ""}`;
    console.log(logMessage);
  }

// CORS Middleware
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers');
    next();
});

MongoClient.connect('mongodb+srv://AJDC6534:fullstack@cluster-afterschoolacti.qqzgrz9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster-AfterSchoolActivities',)
    .then(client => {
        db = client.db('webstore');
            logActivity("Connected to MongoDB successfully!");
        app.listen(app.get('port'), () => {
            logActivity(`Express.js server running at http://localhost:${app.get('port')}`);
        });
    })
    .catch(err => {
        logActivity("Error connecting to MongoDB:", err);
        process.exit(1); // Exit process if DB connection fails
});

app.get('/', (req, res, next,) => {
    res.send('Select a collection, e.g., /collection/messages')
})

// Serve static files (Images)
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

app.get('/images/tabletennis.jpg', (req, res) => {
    logActivity("Request for image received");
});

// Middleware to Validate and Attach Collection
app.param('collectionName', async (req, res, next, collectionName) => {
    try {
        if (!db) {
            return res.status(500).send({ error: 'Database connection not established' });
        }

        // Check if the collection exists in the database
        const collections = await db.listCollections().toArray();
        const collectionExists = collections.some(col => col.name === collectionName);

        if (!collectionExists) {
            return res.status(404).send({ error: `Collection '${collectionName}' not found!` });
        }

        req.collection = db.collection(collectionName);
        return next();
    } catch (err) {
        logActivity("❌ Error in param handling:", err);
        return res.status(500).send({ error: "Error while processing the collection name!" });
    }
});

// Fetch All Documents
app.get('/collection/:collectionName', async (req, res, next) => {
    try {
        if (!db) return res.status(500).send({ error: "Database not connected!" });

        logActivity("🟢 Fetching collection:", req.params.collectionName);
        const collection = db.collection(req.params.collectionName);

        const results = await collection.find({}).maxTimeMS(5000).toArray(); // Add timeout
        logActivity("✅ Data fetched successfully:", results);
        res.send(results);
    } catch (err) {
        logActivity("❌ Timeout/Error fetching data:", err);
        res.status(500).send({ error: "Database request timed out!" });
    }
});

// Insert a Document
app.post('/collection/:collectionName', async (req, res, next) => {
    try {
        if (!db) {
            return res.status(500).send({ error: "Database not connected!" });
        }

        logActivity("🟢 Received data for insertion:", req.body);

        const collection = db.collection(req.params.collectionName);
        const result = await collection.insertOne(req.body);

        // Access the inserted document directly from the result
        const insertedDocument = result.ops ? result.ops[0] : result; // For MongoDB v4.x or newer

        logActivity("✅ Document inserted:", insertedDocument);
        res.status(201).send(insertedDocument); // Send the inserted document back
    } catch (err) {
        logActivity("❌ Error inserting document:", err);
        res.status(500).send({ error: "Failed to insert document!" });
    }
});
// Get Document by ID
app.get('/collection/:collectionName/:id', async (req, res, next) => {
    try {
        if (!db) {
            return res.status(500).send({ error: 'Database not connected!' });
        }

        const { collectionName, id } = req.params;
        logActivity("🟢 Fetching document from collection:", collectionName);
        logActivity("🔍 Document ID:", id);

        // Convert the string ID to an ObjectId
        const objectId = new ObjectId(id);  // Correct usage of ObjectId

        const collection = db.collection(collectionName);
        const result = await collection.findOne({ _id: objectId });

        if (!result) {
            console.warn("⚠️ Document not found.");
            return res.status(404).send({ error: 'Document not found!' });
        }

        logActivity("✅ Document fetched:", result);
        res.send(result);
    } catch (err) {
        logActivity("❌ Error fetching document:", err);
        res.status(500).send({ error: 'Failed to fetch document!' });
    }
});
// Update Document by ID
app.put('/collection/:collectionName/:id', async (req, res) => {
    try {
        if (!db) {
            return res.status(500).send({ error: "Database not connected!" });
        }

        const { collectionName, id } = req.params;
        console.log("🟢 Updating document in collection:", collectionName);
        console.log("🔍 Document ID:", id);

        // Validate ID format before converting
        if (!ObjectId.isValid(id)) {
            return res.status(400).send({ error: "Invalid ID format" });
        }

        const objectId = new ObjectId(id);
        const collection = db.collection(collectionName);

        // Filter out null/undefined fields
        const updateFields = Object.fromEntries(
            Object.entries(req.body).filter(([_, value]) => value !== null && value !== undefined)
        );

        if (Object.keys(updateFields).length === 0) {
            return res.status(400).send({ error: "No valid fields to update" });
        }

        // Perform update
        const result = await collection.updateOne(
            { _id: objectId },
            { $set: updateFields }
        );

        console.log("MongoDB update result:", result);

        if (result.matchedCount === 0) {
            return res.status(404).send({ error: "Document not found!" });
        }

        res.send({ msg: 'success', updatedCount: result.modifiedCount });
    } catch (err) {
        console.error("❌ Error updating document:", err);
        res.status(500).send({ error: "Failed to update document!" });
    }
});

// app.get('/collection/:collectionName/search', async (req, res) => {
//     try {
//         if (!db) {
//             return res.status(500).send({ error: "Database not connected!" });
//         }

//         const { collectionName } = req.params;
//         const { q, sort } = req.query;

//         const collection = db.collection(collectionName);

//         // Build the search query
//         const query = q ? { $text: { $search: q } } : {};

//         // Build the sort option (if any)
//         let sortOption = {};
//         if (sort) {
//             const [field, order] = sort.split(':'); // e.g. "price:asc"
//             sortOption[field] = order === 'desc' ? -1 : 1;
//         }

//         // Fetch results from the database
//         const results = await collection
//             .find(query)
//             .sort(sortOption)
//             .maxTimeMS(5000)
//             .toArray();

//         res.send(results);
//     } catch (err) {
//         console.error("❌ Error during MongoDB search:", err);
//         res.status(500).send({ error: "Database request failed!" });
//     }
// });


