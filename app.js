const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const addDays = require("date-fns/addDays");
const format = require("date-fns/format");
const isValid = require("date-fns/isValid");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");
let db;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server statrted at http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB ERROR: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// CHECK WHETHER THE COLUMNS IS PRESENT OR NOT
const checkStatus = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const checkPriority = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const checkStatusAndPriority = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const checkCategoryAndStatus = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

const checkCategory = (requestQuery) => {
  return requestQuery.category !== undefined;
};

const checkPriorityAndCategory = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};

//CHECK SCENARIOS
const statusScenario = (value) => {
  if (value === "TO DO" || value === "IN PROGRESS" || value === "DONE") {
    return true;
  } else {
    return false;
  }
};

const priorityScenario = (value) => {
  if (value === "HIGH" || value === "MEDIUM" || value === "LOW") {
    return true;
  } else {
    return false;
  }
};

const categoryScenario = (value) => {
  if (value === "WORK" || value === "HOME" || value === "LEARNING") {
    return true;
  } else {
    return false;
  }
};

//CONVERT DUE_DATE INTO JSON
const convertDueDateToJson = (obj) => {
  return {
    id: obj.id,
    todo: obj.todo,
    priority: obj.priority,
    status: obj.status,
    category: obj.category,
    dueDate: obj.due_date,
  };
};

//RETURNS LIST WHOSE STATUS IS TO DO API
app.get("/todos/", async (request, response) => {
  let dbQuery;
  let msg;
  const { status, search_q = "", priority, category } = request.query;

  const sendResponse = async (dbQuery) => {
    const result = await db.all(dbQuery);
    response.send(result.map((list) => convertDueDateToJson(list)));
  };

  switch (true) {
    case checkStatusAndPriority(request.query):
      if (statusScenario(status) && priorityScenario(priority)) {
        dbQuery = `
            SELECT * FROM todo WHERE status = "IN PROGRESS"
             AND priority = "HIGH";
        `;
        sendResponse(dbQuery);
      } else {
        if (statusScenario(status)) {
          response.status(400);
          response.send("Invalid Todo Priority");
        } else {
          response.send("Invalid Todo Status");
        }
      }

      break;

    case checkCategoryAndStatus(request.query):
      if (categoryScenario(category) && statusScenario(status)) {
        dbQuery = `
            SELECT * FROM todo WHERE category = "WORK" 
            AND status = "DONE";
        `;
        sendResponse(dbQuery);
      } else {
        if (categoryScenario(category)) {
          response.send("Invalid Todo Status");
        } else {
          response.status(400);
          response.send("Invalid Todo Category");
        }
      }

      break;

    case checkPriorityAndCategory(request.query):
      if (priorityScenario(priority) && categoryScenario(category)) {
        dbQuery = `
            SELECT * FROM todo WHERE priority = "HIGH"
            AND category = "LEARNING";
        `;
        sendResponse(dbQuery);
      } else {
        if (priorityScenario(priority)) {
          response.status(400);
          response.send("Invalid Todo Category");
        } else {
          response.status(400);
          response.send("Invalid Todo Priority");
        }
      }

      break;

    case checkStatus(request.query):
      if (statusScenario(status)) {
        dbQuery = `
            SELECT * FROM todo WHERE status = "TO DO";
          `;
        sendResponse(dbQuery);
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }

      break;

    case checkPriority(request.query):
      if (priorityScenario(priority)) {
        dbQuery = `
            SELECT *
            FROM todo WHERE priority = "HIGH";
          `;
        sendResponse(dbQuery);
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }

      break;

    case checkCategory(request.query):
      if (categoryScenario(category)) {
        dbQuery = `
            SELECT * FROM todo WHERE category = "HOME";
        `;
        sendResponse(dbQuery);
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }

      break;

    default:
      dbQuery = `
            SELECT * FROM todo WHERE todo LIKE "%${search_q}%";
        `;
      sendResponse(dbQuery);
      break;
  }
});

//GET TODO BASED ON ID API
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const dbQuery = `
        SELECT * FROM todo 
        WHERE id = ${todoId};
    `;
  const todo = await db.get(dbQuery);
  response.send(convertDueDateToJson(todo));
});

//GET TODO USING DATE API
app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  const newDate = new Date(date);

  const isValidDate = isValid(new Date(date));

  if (isValidDate) {
    const formattedDate = format(newDate, "yyyy-MM-dd");
    const dbQuery = `
        SELECT * FROM todo WHERE due_date = "${formattedDate}";
    `;
    const result = await db.all(dbQuery);
    response.send(result.map((list) => convertDueDateToJson(list)));
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

//ADDING A TODO API
app.post("/todos/", async (request, response) => {
  const { id, todo = "", priority, status, category, dueDate } = request.body;
  const isValidDate = isValid(new Date(dueDate));

  if (
    isValidDate === true &&
    priorityScenario(priority) &&
    statusScenario(status) &&
    categoryScenario(category) &&
    todo !== ""
  ) {
    const dbQuery = `
        INSERT INTO todo (id, todo, priority, status, category, due_date)
        VALUES (${id}, "${todo}", "${priority}", "${status}", "${category}"
        ,"${dueDate}");
    `;
    await db.run(dbQuery);
    response.send("Todo Successfully Added");
  } else {
    if (priorityScenario(priority) === false) {
      response.status(400);
      response.send("Invalid Todo Priority");
    } else if (statusScenario(status) === false) {
      response.status(400);
      response.send("Invalid Todo Status");
    } else if (categoryScenario(category) === false) {
      response.status(400);
      response.send("Invalid Todo Category");
    } else if (isValidDate === false) {
      response.status(400);
      response.send("Invalid Due Date");
    }
  }
});

//UPDATE TODO BASED ON ID API
app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const { status, priority, todo = "", category, dueDate } = request.body;

  const sendResponse = async (dbQuery, msg) => {
    await db.run(dbQuery);
    response.send(msg);
  };
  const isValidDate = isValid(new Date(dueDate));

  if (todo !== "") {
    let dbQuery = `
        UPDATE todo SET 
        todo = "${todo}"
        WHERE id = ${todoId};
      `;
    let msg = "Todo Updated";
    sendResponse(dbQuery, msg);
  }

  if (statusScenario(status)) {
    let dbQuery = `
        UPDATE todo 
        SET status = "${status}"
        WHERE id = ${todoId};
      `;
    let msg = "Status Updated";
    sendResponse(dbQuery, msg);
  } else if (status !== undefined) {
    response.status(400);
    response.send("Invalid Todo Status");
  }

  if (priorityScenario(priority)) {
    let dbQuery = `
          UPDATE todo
          SET priority = "${priority}"
          WHERE id = ${todoId};
        `;
    let msg = "Priority Updated";
    sendResponse(dbQuery, msg);
  } else if (priority !== undefined) {
    response.status(400);
    response.send("Invalid Todo Priority");
  }

  if (categoryScenario(category)) {
    let dbQuery = `
          UPDATE todo
          SET category = "${category}"
          WHERE id = ${todoId};
        `;
    let msg = "Category Updated";
    sendResponse(dbQuery, msg);
  } else if (category !== undefined) {
    response.status(400);
    response.send("Invalid Todo Category");
  }

  if (isValidDate) {
    let dbQuery = `
        UPDATE todo SET 
        due_date = "${dueDate}"
        WHERE id = ${todoId};
      `;
    let msg = "Due Date Updated";
    sendResponse(dbQuery, msg);
  } else if (dueDate !== undefined) {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

//DELETE API
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const dbQuery = `
        DELETE FROM todo 
        WHERE id= ${todoId};
    `;
  await db.run(dbQuery);
  response.send("Todo Deleted");
});

module.exports = app;
