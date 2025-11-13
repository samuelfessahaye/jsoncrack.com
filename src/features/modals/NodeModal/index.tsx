import React from "react";
import { useState, useEffect } from "react";
import type { ModalProps } from "@mantine/core";
import { Modal, Stack, Text, ScrollArea, Flex, CloseButton, Textarea, Group, Button } from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import toast from "react-hot-toast";
import type { NodeData } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";
import useFile from "../../../store/useFile";

// return object from json removing array and object fields
const normalizeNodeData = (nodeRows: NodeData["text"]) => {
  if (!nodeRows || nodeRows.length === 0) return "{}";
  if (nodeRows.length === 1 && !nodeRows[0].key) return `${nodeRows[0].value}`;

  const obj = {};
  nodeRows?.forEach(row => {
    if (row.type !== "array" && row.type !== "object") {
      if (row.key) obj[row.key] = row.value;
    }
  });
  return JSON.stringify(obj, null, 2);
};

// return json path in the format $["customer"]
const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

// update JSON at a specific path
const updateJsonAtPath = (jsonString: string, path: NodeData["path"], newValue: any) => {
  try {
    const json = JSON.parse(jsonString);
    
    if (!path || path.length === 0) {
      // Root level update
      return JSON.stringify(newValue, null, 2);
    }
    
    let current = json;
    
    // Navigate to the parent of the target
    for (let i = 0; i < path.length - 1; i++) {
      const segment = path[i];
      if (current[segment] === undefined) {
        // Create array if next segment is a number, otherwise create object
        current[segment] = typeof path[i + 1] === "number" ? [] : {};
      }
      current = current[segment];
    }
    
    // Update the target value
    const lastSegment = path[path.length - 1];
    current[lastSegment] = newValue;
    
    return JSON.stringify(json, null, 2);
  } catch (error) {
    console.error("Failed to update JSON at path:", error);
    throw new Error("Failed to update JSON structure");
  }
};

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => state.selectedNode);
  const contents = useFile(state => state.contents);
  const setContents = useFile(state => state.setContents);

  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState("");
  const [originalData, setOriginalData] = useState("");

  useEffect(() => {
    if (opened && nodeData) {
      const normalizedData = normalizeNodeData(nodeData.text);
      setEditedData(normalizedData);
      setOriginalData(normalizedData);
      setIsEditing(false);
    }
  }, [opened, nodeData]);

  const handleEdit = () => setIsEditing(true);
  
  const handleSave = () => {
    try {
      // Parse the edited value to validate it's valid JSON
      const parsedValue = JSON.parse(editedData);
      
      // Update the JSON content at the specific path
      const updatedJson = updateJsonAtPath(contents, nodeData?.path, parsedValue);
      
      // Update the file contents (this will update both the editor and graph)
      setContents({ contents: updatedJson });
      
      setOriginalData(editedData);
      setIsEditing(false);
      toast.success("Node updated successfully!");
    } catch (error) {
      console.error("Save error:", error);
      if (error instanceof SyntaxError) {
        toast.error("Invalid JSON format. Please check your syntax.");
      } else {
        toast.error("Failed to update node. Please try again.");
      }
    }
  };
  
  const handleCancel = () => {
    setEditedData(originalData);
    setIsEditing(false);
  };

  const handleClose = () => {
    handleCancel();
    onClose();
  };

  return (
    <Modal size="auto" opened={opened} onClose={handleClose} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Stack gap="xs">
          <Flex justify="space-between" align="center">
            <Text fz="xs" fw={500}>
              Content
            </Text>
            <CloseButton onClick={handleClose} />
          </Flex>
          <ScrollArea.Autosize mah={250} maw={600}>
            {isEditing ? (
            <Textarea
              value={editedData}
              onChange={e => setEditedData(e.target.value)}
              autosize
              minRows={6}
              maxRows={12}
              styles={{
                input: {
                  fontFamily: "monospace"
                }
              }}
            />
            ) : (
            <CodeHighlight
              code={editedData}
              miw={350}
              maw={600}
              language="json"
              withCopyButton
            />
            )}
          </ScrollArea.Autosize>
        </Stack>
        <Text fz="xs" fw={500}>
          JSON Path
        </Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={jsonPathToString(nodeData?.path)}
            miw={350}
            mah={250}
            language="json"
            copyLabel="Copy to clipboard"
            copiedLabel="Copied to clipboard"
            withCopyButton
          />
        </ScrollArea.Autosize>
        <Group justify="flex-end" pt="sm">
          {!isEditing && (
            <Button color="blue" onClick={handleEdit}>
              Edit
            </Button>
          )}
          {isEditing && (
            <>
              <Button variant="light" color="grey" onClick={handleCancel}>
                Cancel
              </Button>
              <Button color="green" onClick={handleSave}>
                Save
              </Button>
        </>
          )}
        </Group>
      </Stack>
    </Modal>
  );
};
