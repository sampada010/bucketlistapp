import { useState, useEffect } from "react";
import {
  Authenticator,
  Button,
  Text,
  TextField,
  Heading,
  Flex,
  View,
  Image,
  Grid,
  Divider,
} from "@aws-amplify/ui-react";
import { Amplify, Auth } from "aws-amplify";
import "@aws-amplify/ui-react/styles.css";
import { getUrl, uploadData } from "aws-amplify/storage";
import { generateClient } from "aws-amplify/data";
import outputs from "../amplify_outputs.json";

/**
 * @type {import('aws-amplify/data').Client<import('../amplify/data/resource').Schema>}
 */
Amplify.configure(outputs);

const client = generateClient({
  authMode: async () => {
    try {
      await Auth.currentAuthenticatedUser();
      return "userPool"; // Use Cognito User Pool if authenticated
    } catch {
      return "apiKey"; // Fallback to API key (if enabled)
    }
  },
});

export default function App() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    try {
      const user = await Auth.currentAuthenticatedUser();
      const userId = user.attributes.sub;

      const { data: items } = await client.models.BucketItem.list();

      await Promise.all(
        items.map(async (item) => {
          if (item.image) {
            const linkToStorageFile = await getUrl({
              path: `media/${userId}/${item.image}`,
            });
            item.image = linkToStorageFile.url;
          }
          return item;
        })
      );

      setItems(items);
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  }

  async function createItem(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const user = await Auth.currentAuthenticatedUser();
    const userId = user.attributes.sub;

    const { data: newItem } = await client.models.BucketItem.create({
      title: form.get("title"),
      description: form.get("description"),
      image: form.get("image").name,
    });

    if (newItem.image) {
      await uploadData({
        path: `media/${userId}/${newItem.image}`,
        data: form.get("image"),
      }).result;
    }

    fetchItems();
    event.target.reset();
  }

  async function deleteItem({ id }) {
    await client.models.BucketItem.delete({ id });
    fetchItems();
  }

  return (
    <Authenticator>
      {({ signOut }) => (
        <Flex
          className="App"
          justifyContent="center"
          alignItems="center"
          direction="column"
          width="70%"
          margin="0 auto"
        >
          <Heading level={1}>My Bucket List</Heading>
          <View as="form" margin="3rem 0" onSubmit={createItem}>
            <Flex direction="column" gap="2rem" padding="2rem">
              <TextField name="title" placeholder="Bucket List Item" required />
              <TextField name="description" placeholder="Description" required />
              <View as="input" type="file" accept="image/png, image/jpeg" name="image" />
              <Button type="submit">Add to Bucket List</Button>
            </Flex>
          </View>
          <Divider />
          <Heading level={2}>My Bucket List Items</Heading>
          <Grid margin="3rem 0" autoFlow="column" gap="2rem">
            {items.map((item) => (
              <Flex key={item.id} direction="column" padding="2rem" border="1px solid #ccc" borderRadius="5%">
                <Heading level="3">{item.title}</Heading>
                <Text fontStyle="italic">{item.description}</Text>
                {item.image && <Image src={item.image} alt={`Visual for ${item.title}`} style={{ width: 400 }} />}
                <Button variation="destructive" onClick={() => deleteItem(item)}>Delete Item</Button>
              </Flex>
            ))}
          </Grid>
          <Button onClick={signOut}>Sign Out</Button>
        </Flex>
      )}
    </Authenticator>
  );
}
