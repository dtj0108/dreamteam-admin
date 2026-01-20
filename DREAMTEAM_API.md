# Finance API Reference

Complete API documentation for mobile developers.

---

## Base URL

```
Production: https://app.yourdomain.com/api
Development: http://localhost:3001/api
```

## Authentication

All endpoints (except login/signup) require authentication via session cookie.

**Error Responses:**
- `401 Unauthorized` - No valid session
- `403 Forbidden` - Not a workspace member

---

## Auth Endpoints

### POST /auth/login

Sign in and initiate 2FA verification.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Verification code sent to your phone",
  "userId": "uuid",
  "phone": "+1234567890",
  "name": "John Doe"
}
```

---

### POST /auth/signup

Create new user account.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+12345678901",
  "password": "password123",
  "companyName": "Acme Corp"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Verification code sent to your phone",
  "userId": "uuid",
  "phone": "+1234567890",
  "joinedTeam": false,
  "teamName": "John Doe's Workspace",
  "workspaceId": "uuid"
}
```

**Validation:**
- Email: valid format required
- Phone: E.164 format (+country-code number)
- Password: minimum 8 characters

---

### GET /auth/me

Get authenticated user profile.

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "companyName": "Acme Corp",
    "workspaceId": "uuid",
    "workspaceName": "Acme Corp Workspace",
    "workspaceRole": "owner",
    "allowedProducts": ["finance", "sales", "team", "projects", "knowledge"],
    "phoneVerified": true
  }
}
```

---

### POST /auth/send-otp

Send a verification code to a phone number via SMS.

**Request:**
```json
{
  "phone": "+12345678901"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Verification code sent"
}
```

**Validation:**
- Phone: E.164 format required (+country-code number)

**Errors:**
- `400` - Phone number missing or invalid format

---

### POST /auth/verify-otp

Verify OTP code and complete authentication.

**Request:**
```json
{
  "phone": "+12345678901",
  "code": "123456",
  "isSignup": false
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged in successfully",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "user@example.com"
  }
}
```

**Notes:**
- Set `isSignup: true` when verifying after signup (changes success message)
- Marks `phone_verified: true` and `pending_2fa: false` on profile

**Errors:**
- `400` - Phone or code missing
- `401` - Invalid verification code
- `404` - No account found with phone number

---

### POST /auth/logout

Sign out the current user and clear session.

**Request:** No body required

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Accounts

### GET /accounts

Fetch all accounts with totals.

**Response (200):**
```json
{
  "accounts": [
    {
      "id": "uuid",
      "name": "Checking Account",
      "type": "checking",
      "institution": "Bank of America",
      "balance": 5000.00,
      "currency": "USD",
      "last_four": "1234",
      "is_plaid_linked": true
    }
  ],
  "totals": {
    "assets": 15000.00,
    "liabilities": 2000.00,
    "netWorth": 13000.00
  }
}
```

**Account Types:** `checking`, `savings`, `investment`, `cash`, `credit_card`, `loan`

---

## Transactions

### GET /transactions

Fetch transactions with optional filters.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `accountId` | string | Filter by account (default: "all") |
| `startDate` | string | YYYY-MM-DD format |
| `endDate` | string | YYYY-MM-DD format |
| `categoryId` | string | Filter by category |
| `limit` | number | Max results |

**Response (200):**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "amount": -45.99,
      "date": "2025-01-09",
      "description": "Starbucks Coffee",
      "account_id": "uuid",
      "category_id": "uuid",
      "category": {
        "id": "uuid",
        "name": "Coffee",
        "type": "expense",
        "color": "#FF6B6B"
      }
    }
  ]
}
```

---

### POST /transactions/import

Bulk import transactions.

**Request:**
```json
{
  "account_id": "uuid",
  "skip_duplicates": true,
  "transactions": [
    {
      "date": "2025-01-09",
      "amount": -50.00,
      "description": "Coffee Shop",
      "notes": "Morning coffee",
      "category_id": "uuid"
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "imported": 1,
  "total": 1,
  "failed": 0,
  "skipped_duplicates": 0,
  "account": "Checking Account"
}
```

**Limit:** Max 100 transactions per request

---

### POST /transactions/bulk-update

Update category for multiple transactions.

**Request:**
```json
{
  "transaction_ids": ["uuid1", "uuid2"],
  "category_id": "uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "updated": 2
}
```

**Limit:** Max 500 transactions

---

### POST /transactions/bulk-delete

Delete multiple transactions.

**Request:**
```json
{
  "transaction_ids": ["uuid1", "uuid2"]
}
```

**Response (200):**
```json
{
  "success": true,
  "deleted": 2
}
```

---

### POST /transactions/check-duplicates

Check for duplicates before import.

**Request:**
```json
{
  "account_id": "uuid",
  "transactions": [
    {
      "date": "2025-01-09",
      "amount": -50.00,
      "description": "Coffee Shop"
    }
  ]
}
```

**Response (200):**
```json
{
  "results": [
    {
      "isDuplicate": false,
      "similarity": 0.85,
      "matchedTransaction": null
    }
  ],
  "duplicateCount": 0,
  "totalChecked": 1
}
```

---

### GET /transactions/recent

Get 10 most recent transactions.

**Response (200):**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "description": "Starbucks",
      "amount": -45.99,
      "date": "2025-01-09",
      "accountName": "Checking",
      "categoryName": "Coffee",
      "categoryColor": "#FF6B6B",
      "type": "expense"
    }
  ]
}
```

---

### POST /transactions/categorize

AI-powered auto-categorization.

**Request:**
```json
{
  "descriptions": ["Starbucks Coffee", "Amazon Purchase", "Salary Deposit"]
}
```

**Response (200):**
```json
{
  "success": true,
  "suggestions": [
    {
      "description": "Starbucks Coffee",
      "categoryId": "uuid",
      "categoryName": "Coffee",
      "confidence": "high"
    }
  ],
  "categoriesUsed": 25
}
```

**Requires:** `OPENAI_API_KEY` environment variable

---

## Categories

### GET /categories

Fetch all categories.

**Response (200):**
```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Coffee",
      "type": "expense",
      "color": "#FF6B6B",
      "is_system": true,
      "workspace_id": null
    }
  ]
}
```

**Category Types:** `expense`, `income`

---

## Budgets

### GET /budgets

Fetch all active budgets with spending.

**Response (200):**
```json
{
  "budgets": [
    {
      "id": "uuid",
      "amount": 500.00,
      "spent": 245.50,
      "remaining": 254.50,
      "percentUsed": 49.1,
      "period": "monthly",
      "start_date": "2025-01-01",
      "periodStart": "2025-01-01",
      "periodEnd": "2025-02-01",
      "category": {
        "id": "uuid",
        "name": "Groceries"
      },
      "alerts": []
    }
  ]
}
```

**Period Types:** `weekly`, `biweekly`, `monthly`, `yearly`

---

### POST /budgets

Create a new budget.

**Request:**
```json
{
  "category_id": "uuid",
  "amount": 500.00,
  "period": "monthly",
  "start_date": "2025-01-01",
  "rollover": false,
  "alert_thresholds": [75, 90]
}
```

**Response (201):**
```json
{
  "budget": {
    "id": "uuid",
    "category_id": "uuid",
    "amount": 500.00,
    "period": "monthly",
    "start_date": "2025-01-01"
  }
}
```

---

### GET /budgets/[id]

Get single budget with transactions.

**Response (200):**
```json
{
  "budget": {
    "id": "uuid",
    "amount": 500.00,
    "spent": 245.50,
    "remaining": 254.50,
    "percentUsed": 49.1,
    "periodStart": "2025-01-01",
    "periodEnd": "2025-02-01"
  },
  "transactions": [
    {
      "id": "uuid",
      "amount": -45.99,
      "date": "2025-01-05",
      "description": "Whole Foods"
    }
  ]
}
```

---

### PATCH /budgets/[id]

Update budget settings.

**Request:**
```json
{
  "amount": 600.00,
  "period": "monthly",
  "rollover": true,
  "is_active": true
}
```

---

### DELETE /budgets/[id]

Delete a budget.

**Response (200):**
```json
{
  "success": true
}
```

---

## Subscriptions

### GET /subscriptions

Fetch all subscriptions.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `includeInactive` | boolean | Include inactive subscriptions |
| `summary` | boolean | Return only summary stats |

**Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Netflix",
    "merchant_pattern": "netflix",
    "amount": 15.99,
    "frequency": "monthly",
    "next_renewal_date": "2025-02-09",
    "last_charge_date": "2025-01-09",
    "category_id": "uuid",
    "reminder_days_before": 3,
    "is_active": true,
    "notes": "Family plan"
  }
]
```

**Frequency Types:** `daily`, `weekly`, `biweekly`, `monthly`, `quarterly`, `yearly`

---

### POST /subscriptions

Create a subscription.

**Request:**
```json
{
  "name": "Netflix",
  "merchant_pattern": "netflix",
  "amount": 15.99,
  "frequency": "monthly",
  "next_renewal_date": "2025-02-09",
  "last_charge_date": "2025-01-09",
  "category_id": "uuid",
  "reminder_days_before": 3,
  "notes": "Family plan"
}
```

---

### GET /subscriptions/[id]

Get single subscription.

---

### PUT /subscriptions/[id]

Update subscription.

---

### DELETE /subscriptions/[id]

Delete subscription.

---

### POST /subscriptions/detect

AI-powered subscription detection from transaction history.

**Response (200):**
```json
{
  "detected": [
    {
      "name": "Spotify",
      "merchant_pattern": "spotify",
      "amount": 9.99,
      "frequency": "monthly",
      "next_renewal_date": "2025-02-09",
      "last_charge_date": "2025-01-09",
      "confidence": 95,
      "transaction_count": 12,
      "sample_transactions": []
    }
  ],
  "analyzed_transactions": 150
}
```

---

### GET /subscriptions/upcoming

Get upcoming renewals.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `days` | number | 7 | Days ahead to check |

**Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Netflix",
    "amount": 15.99,
    "next_renewal_date": "2025-01-15"
  }
]
```

---

## Analytics

### GET /analytics/overview

Dashboard overview with trends.

**Response (200):**
```json
{
  "currentMonth": {
    "income": 5000.00,
    "expenses": 2500.00,
    "profit": 2500.00
  },
  "lastMonth": {
    "income": 4800.00,
    "expenses": 2400.00,
    "profit": 2400.00
  },
  "allTime": {
    "income": 125000.00,
    "expenses": 80000.00,
    "profit": 45000.00
  },
  "changes": {
    "income": 4.17,
    "expenses": 4.17,
    "profit": 4.17
  },
  "totalBalance": 8500.00,
  "accountCount": 3,
  "trend": [
    {
      "month": "2024-07",
      "label": "Jul",
      "income": 4500.00,
      "expenses": 2200.00,
      "profit": 2300.00
    }
  ]
}
```

---

### GET /analytics/expenses

Expense analysis by category.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `startDate` | string | YYYY-MM-DD |
| `endDate` | string | YYYY-MM-DD |

**Response (200):**
```json
{
  "period": {
    "startDate": "2024-12-01",
    "endDate": "2025-01-09"
  },
  "summary": {
    "totalExpenses": 2500.00,
    "transactionCount": 45,
    "categoryCount": 8,
    "avgDaily": 83.33,
    "avgMonthly": 1250.00
  },
  "byCategory": [
    {
      "id": "uuid",
      "name": "Groceries",
      "amount": 600.00,
      "color": "#10B981",
      "count": 12
    }
  ],
  "topCategories": [],
  "monthlyTrend": [
    {
      "month": "2024-12",
      "label": "Dec 2024",
      "amount": 1800.00
    }
  ]
}
```

---

### GET /analytics/income

Income analysis by source.

**Query Parameters:** Same as expenses

**Response (200):**
```json
{
  "period": {},
  "summary": {
    "totalIncome": 5000.00,
    "transactionCount": 2,
    "sourceCount": 1,
    "avgDaily": 166.67,
    "avgMonthly": 2500.00
  },
  "byCategory": [],
  "topSources": [],
  "monthlyTrend": []
}
```

---

### GET /analytics/cash-flow

Cash flow with running balance.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `startDate` | string | - | YYYY-MM-DD |
| `endDate` | string | - | YYYY-MM-DD |
| `groupBy` | string | "month" | "day", "week", "month" |

**Response (200):**
```json
{
  "period": {
    "startDate": "2024-07-01",
    "endDate": "2025-01-09",
    "groupBy": "month"
  },
  "summary": {
    "totalInflow": 30000.00,
    "totalOutflow": 18000.00,
    "netCashFlow": 12000.00,
    "avgMonthlyInflow": 5000.00,
    "avgMonthlyOutflow": 3000.00
  },
  "trend": [
    {
      "period": "2024-07",
      "label": "Jul 2024",
      "inflow": 5000.00,
      "outflow": 2800.00,
      "netFlow": 2200.00,
      "runningBalance": 2200.00
    }
  ]
}
```

---

### GET /analytics/profit-loss

P&L with period comparison.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `startDate` | string | YYYY-MM-DD |
| `endDate` | string | YYYY-MM-DD |
| `compare` | boolean | Compare with previous period |

**Response (200):**
```json
{
  "period": {},
  "summary": {
    "totalIncome": 5000.00,
    "totalExpenses": 2500.00,
    "netProfit": 2500.00,
    "profitMargin": 50.0
  },
  "incomeByCategory": [],
  "expensesByCategory": [],
  "comparison": {
    "income": {
      "previous": 4800.00,
      "change": 200.00,
      "percentChange": 4.17
    },
    "expenses": {},
    "netProfit": {}
  }
}
```

---

### GET /analytics/budget-vs-actual

Budget comparison.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `startDate` | string | YYYY-MM-DD |
| `endDate` | string | YYYY-MM-DD |

**Response (200):**
```json
{
  "period": {},
  "summary": {
    "totalBudgeted": 3000.00,
    "totalActual": 2500.00,
    "totalVariance": 500.00,
    "variancePercent": 16.67,
    "budgetCount": 5,
    "overBudgetCount": 1,
    "underBudgetCount": 4
  },
  "comparison": [
    {
      "budgetId": "uuid",
      "categoryId": "uuid",
      "categoryName": "Groceries",
      "categoryColor": "#10B981",
      "budgetAmount": 600.00,
      "actualAmount": 580.00,
      "variance": 20.00,
      "variancePercent": 3.33,
      "utilizationPercent": 96.67,
      "status": "warning"
    }
  ]
}
```

**Status Values:** `over` (>100%), `warning` (80-100%), `under` (<80%)

---

### GET /analytics/calendar

Get financial events for calendar view (subscriptions, recurring income/expenses, budget resets).

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `startDate` | string | Yes | YYYY-MM-DD format |
| `endDate` | string | Yes | YYYY-MM-DD format |

**Response (200):**
```json
[
  {
    "id": "sub-uuid",
    "type": "subscription",
    "date": "2025-01-15",
    "title": "Netflix",
    "amount": 15.99,
    "category": "Entertainment",
    "categoryColor": "#FF6B6B",
    "color": "#f43f5e"
  },
  {
    "id": "rule-uuid",
    "type": "income",
    "date": "2025-01-31",
    "title": "Salary Deposit",
    "amount": 5000.00,
    "category": "Salary",
    "categoryColor": "#10B981",
    "color": "#10b981"
  },
  {
    "id": "budget-uuid-2025-02-01",
    "type": "budget_reset",
    "date": "2025-02-01",
    "title": "Groceries resets",
    "amount": 600.00,
    "category": "Groceries",
    "categoryColor": "#3B82F6",
    "color": "#3b82f6"
  }
]
```

**Event Types:**
| Type | Color | Description |
|------|-------|-------------|
| `subscription` | rose (#f43f5e) | Upcoming subscription renewals |
| `income` | emerald (#10b981) | Recurring income events |
| `expense` | amber (#f59e0b) | Recurring expense events |
| `budget_reset` | blue (#3b82f6) | Budget period reset dates |

---

## Agent Communication

### POST /api/workspaces/[workspaceId]/agents/[agentId]/chat

Send a message to an agent within a workspace. The agent automatically has access to the current user's workspace ID and profile information.

**Request:**
```json
{
  "message": "What is my account balance?",
  "conversationHistory": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi! How can I help?" }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes | The user's message to the agent |
| `conversationHistory` | array | No | Previous messages for context |

**Response (200):**
```json
{
  "response": "Your current balance is $5,000...",
  "usage": {
    "inputTokens": 150,
    "outputTokens": 120
  }
}
```

**Notes:**
- Workspace ID and user info are automatically injected into the agent's context
- Agents will NOT ask for workspace ID or user ID - they already have this information
- `conversationHistory` allows multi-turn conversations without server-side session storage
- Both system agents and workspace-specific agents are accessible

**Errors:**
- `400` - Message missing or invalid
- `401` - Not authenticated
- `403` - Not a member of the workspace
- `404` - Agent not found or not accessible from this workspace
- `500` - Agent execution error

---

## Plaid Integration

See [PLAID_INTEGRATION.md](./PLAID_INTEGRATION.md) for detailed Plaid documentation.

### Quick Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/plaid/link-token` | Create link token |
| POST | `/plaid/exchange` | Exchange public token |
| GET | `/plaid/accounts` | List connected banks |
| POST | `/plaid/sync` | Manual transaction sync |
| DELETE | `/plaid/items/[id]` | Disconnect bank |
| POST | `/plaid/webhook` | Webhook handler |

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (no session) |
| 403 | Forbidden (not workspace member) |
| 404 | Not Found |
| 500 | Server Error |

---

## Rate Limits & Constraints

| Operation | Limit |
|-----------|-------|
| Bulk update/delete | 500 items per request |
| Transaction import | 100 per batch |
| AI categorization | 500 descriptions per request |
| Duplicate detection | ±1 day window |

---

## Common Headers

**Request:**
```
Content-Type: application/json
```

**Response (financial data):**
```
Cache-Control: no-cache, no-store, must-revalidate
```
