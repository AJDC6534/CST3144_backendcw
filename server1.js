const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const path = require('path');

const app = express();
app.use(express.json());
app.set('port', 3000);

// CORS Middleware
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers');
    next();
});

MongoClient.connect('mongodb+srv://AJDC6534:fullstack@cluster-afterschoolacti.qqzgrz9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster-AfterSchoolActivities', { useUnifiedTopology: true })
    .then(client => {
        db = client.db('webstore');
        console.log("Connected to MongoDB successfully!");
        app.listen(app.get('port'), () => {
            console.log(`Express.js server running at http://localhost:${app.get('port')}`);
        });
    })
    .catch(err => {
        console.error("Error connecting to MongoDB:", err);
        process.exit(1); // Exit process if DB connection fails
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
        console.error("❌ Error in param handling:", err);
        return res.status(500).send({ error: "Error while processing the collection name!" });
    }
});


// Fetch All Documents
app.get('/collection/:collectionName', async (req, res, next) => {
    try {
        if (!db) return res.status(500).send({ error: "Database not connected!" });

        console.log("🟢 Fetching collection:", req.params.collectionName);
        const collection = db.collection(req.params.collectionName);

        const results = await collection.find({}).maxTimeMS(5000).toArray(); // Add timeout
        console.log("✅ Data fetched successfully:", results);
        res.send(results);
    } catch (err) {
        console.error("❌ Timeout/Error fetching data:", err);
        res.status(500).send({ error: "Database request timed out!" });
    }
});

// Insert a Document
app.post('/collection/:collectionName', async (req, res, next) => {
    try {
        if (!db) {
            return res.status(500).send({ error: "Database not connected!" });
        }

        console.log("🟢 Received data for insertion:", req.body);

        const collection = db.collection(req.params.collectionName);
        const result = await collection.insertOne(req.body);

        // Access the inserted document directly from the result
        const insertedDocument = result.ops ? result.ops[0] : result; // For MongoDB v4.x or newer

        console.log("✅ Document inserted:", insertedDocument);
        res.status(201).send(insertedDocument); // Send the inserted document back
    } catch (err) {
        console.error("❌ Error inserting document:", err);
        res.status(500).send({ error: "Failed to insert document!" });
    }
});

// Get Document by ID
const { ObjectId } = require('mongodb');  // Correct import

app.get('/collection/:collectionName/:id', async (req, res, next) => {
    try {
        if (!db) {
            return res.status(500).send({ error: 'Database not connected!' });
        }

        const { collectionName, id } = req.params;
        console.log("🟢 Fetching document from collection:", collectionName);
        console.log("🔍 Document ID:", id);

        // Convert the string ID to an ObjectId
        const objectId = new ObjectId(id);  // Correct usage of ObjectId

        const collection = db.collection(collectionName);
        const result = await collection.findOne({ _id: objectId });

        if (!result) {
            console.warn("⚠️ Document not found.");
            return res.status(404).send({ error: 'Document not found!' });
        }

        console.log("✅ Document fetched:", result);
        res.send(result);
    } catch (err) {
        console.error("❌ Error fetching document:", err);
        res.status(500).send({ error: 'Failed to fetch document!' });
    }
});


// Update Document by ID
app.put('/collection/:collectionName/:id', async (req, res, next) => {
    try {
        if (!db) {
            return res.status(500).send({ error: "Database not connected!" });
        }

        const { collectionName, id } = req.params;
        console.log("🟢 Updating document in collection:", collectionName);
        console.log("🔍 Document ID:", id);

        // Convert the string ID to an ObjectId
        const objectId = new ObjectId(id);  // Correct usage of ObjectId

        const collection = db.collection(collectionName);

        // Prepare the update fields (filter out any null or undefined values)
        const updateFields = {};

        for (const key in req.body) {
            if (req.body[key] !== null && req.body[key] !== undefined) {
                updateFields[key] = req.body[key];
            }
        }

        // If no valid fields to update, return an error
        if (Object.keys(updateFields).length === 0) {
            return res.status(400).send({ error: "No valid fields to update" });
        }

        // Use the updateOne method to update the document
        const result = await collection.updateOne(
            { _id: objectId },  // Find the document by _id
            { $set: updateFields }   // Update the document with valid data
        );

        // Check if a document was matched and updated
        if (result.matchedCount === 0) {
            console.warn("⚠️ No document found with the provided ID.");
            return res.status(404).send({ error: "Document not found!" });
        }

        console.log("✅ Document updated:", result);
        res.send({ msg: 'success', updatedCount: result.modifiedCount });
    } catch (err) {
        console.error("❌ Error updating document:", err);
        res.status(500).send({ error: "Failed to update document!" });
    }
});


// Delete Document by ID

app.delete('/collection/:collectionName/:id', async (req, res, next) => {
    try {
        if (!db) {
            return res.status(500).send({ error: "Database not connected!" });
        }

        const { collectionName, id } = req.params;
        console.log("🟢 Deleting document from collection:", collectionName);
        console.log("🔍 Document ID:", id);

        // Convert the string ID to an ObjectId
        const objectId = new ObjectId(id);  // Correct usage of ObjectId

        const collection = db.collection(collectionName);

        // Use the deleteOne method to delete the document
        const result = await collection.deleteOne({ _id: objectId });

        // Check if the document was deleted
        if (result.deletedCount === 0) {
            console.warn("⚠️ No document found with the provided ID.");
            return res.status(404).send({ error: "Document not found!" });
        }

        console.log("✅ Document deleted:", result);
        res.send({ msg: 'success', deletedCount: result.deletedCount });
    } catch (err) {
        console.error("❌ Error deleting document:", err);
        res.status(500).send({ error: "Failed to delete document!" });
    }
});

app.use(express.static(path.join(__dirname, 'frontend')));

// Optionally, handle routing for other requests (like HTML)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});


