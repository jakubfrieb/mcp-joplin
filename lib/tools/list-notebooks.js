class ListNotebooks {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async call() {
    try {
      const notebooks = await this.apiClient.getAllItems('/folders', { query: { fields: 'id,title,parent_id' } });

      const notebooksByParentId = {};

      notebooks.forEach(notebook => {
        const parentId = notebook.parent_id;
        if (!notebooksByParentId[parentId]) {
          notebooksByParentId[parentId] = [];
        }
        notebooksByParentId[parentId].push(notebook);
      });

      // Add a header with instructions
      const resultLines = [
        "Joplin Notebooks:\n",
        "NOTE: To read a notebook, use the notebook_id with the read_notebook command\n",
        "Example: read_notebook notebook_id=\"your-notebook-id\"\n\n"
      ];

      // Add the notebook hierarchy
      resultLines.push(...this.notebooksLines(notebooksByParentId[''], { indent: 0, notebooksByParentId }));

      return resultLines.join('');
    } catch (error) {
      console.error('Error listing notebooks:', error);
      return `Error listing notebooks: ${error.message || 'Unknown error'}`;
    }
  }

  notebooksLines(notebooks, { indent = 0, notebooksByParentId }) {
    const result = [];
    const indentSpaces = ' '.repeat(indent);

    this.sortNotebooks(notebooks).forEach(notebook => {
      const id = notebook.id;
      result.push(`${indentSpaces}Notebook: "${notebook.title}" (notebook_id: "${id}")\n`);

      const childNotebooks = notebooksByParentId[id];
      if (childNotebooks) {
        result.push(...this.notebooksLines(childNotebooks, {
          indent: indent + 2,
          notebooksByParentId
        }));
      }
    });

    return result;
  }

  sortNotebooks(notebooks) {
    // Ensure that notebooks starting with '[0]' are sorted first
    const CHARACTER_BEFORE_A = String.fromCharCode('A'.charCodeAt(0) - 1);
    return [...notebooks].sort((a, b) => {
      const titleA = a.title.replace('[', CHARACTER_BEFORE_A);
      const titleB = b.title.replace('[', CHARACTER_BEFORE_A);
      return titleA.localeCompare(titleB);
    });
  }
}

export default ListNotebooks;
