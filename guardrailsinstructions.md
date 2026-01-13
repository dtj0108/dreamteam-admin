# Reduce Hallucinations

---

Even the most advanced language models, like Claude, can sometimes generate text that is factually incorrect or inconsistent with the given context. This phenomenon, known as "hallucination," can undermine the reliability of your AI-driven solutions.

This guide will explore techniques to minimize hallucinations and ensure Claude's outputs are accurate and trustworthy.

---

## Basic Hallucination Minimization Strategies

### Allow Claude to Say "I Don't Know"

Explicitly give Claude permission to admit uncertainty. This simple technique can drastically reduce false information.

**Example: Analyzing a merger & acquisition report**

| Role | Content |
| ---- | ------- |
| User | As our M&A advisor, analyze this report on the potential acquisition of AcmeCo by ExampleCorp.<br/><br/>`<report>{{REPORT}}</report>`<br/><br/>Focus on financial projections, integration risks, and regulatory hurdles. If you're unsure about any aspect or if the report lacks necessary information, say "I don't have enough information to confidently assess this." |

### Use Direct Quotes for Factual Grounding

For tasks involving long documents (>20K tokens), ask Claude to extract word-for-word quotes first before performing its task. This grounds its responses in the actual text, reducing hallucinations.

**Example: Auditing a data privacy policy**

| Role | Content |
| ---- | ------- |
| User | As our Data Protection Officer, review this updated privacy policy for GDPR and CCPA compliance.<br/><br/>`<policy>{{POLICY}}</policy>`<br/><br/>1. Extract exact quotes from the policy that are most relevant to GDPR and CCPA compliance. If you can't find relevant quotes, state "No relevant quotes found."<br/><br/>2. Use the quotes to analyze the compliance of these policy sections, referencing the quotes by number. Only base your analysis on the extracted quotes. |

### Verify with Citations

Make Claude's response auditable by having it cite quotes and sources for each of its claims. You can also have Claude verify each claim by finding a supporting quote after it generates a response. If it can't find a quote, it must retract the claim.

**Example: Drafting a press release on a product launch**

| Role | Content |
| ---- | ------- |
| User | Draft a press release for our new cybersecurity product, AcmeSecurity Pro, using only information from these product briefs and market reports.<br/><br/>`<documents>{{DOCUMENTS}}</documents>`<br/><br/>After drafting, review each claim in your press release. For each claim, find a direct quote from the documents that supports it. If you can't find a supporting quote for a claim, remove that claim from the press release and mark where it was removed with empty [] brackets. |

---

## Advanced Techniques

- **Chain-of-thought verification**: Ask Claude to explain its reasoning step-by-step before giving a final answer. This can reveal faulty logic or assumptions.

- **Best-of-N verification**: Run Claude through the same prompt multiple times and compare the outputs. Inconsistencies across outputs could indicate hallucinations.

- **Iterative refinement**: Use Claude's outputs as inputs for follow-up prompts, asking it to verify or expand on previous statements. This can catch and correct inconsistencies.

- **External knowledge restriction**: Explicitly instruct Claude to only use information from provided documents and not its general knowledge.

**Note:** Remember, while these techniques significantly reduce hallucinations, they don't eliminate them entirely. Always validate critical information, especially for high-stakes decisions.

---

# Increase Output Consistency

**Tip:** If you need Claude to always output valid JSON that conforms to a specific schema, use [Structured Outputs](/docs/en/build-with-claude/structured-outputs) instead of the prompt engineering techniques below. Structured outputs provide guaranteed schema compliance and are specifically designed for this use case.

The techniques below are useful for general output consistency or when you need flexibility beyond strict JSON schemas.

---

## Specify the Desired Output Format

Precisely define your desired output format using JSON, XML, or custom templates so that Claude understands every output formatting element you require.

**Example: Standardizing customer feedback**

| Role | Content |
| ---- | ------- |
| User | You're a Customer Insights AI. Analyze this feedback and output in JSON format with keys: "sentiment" (positive/negative/neutral), "key_issues" (list), and "action_items" (list of dicts with "team" and "task").<br/><br/>"I've been a loyal user for 3 years, but the recent UI update is a disaster. Finding basic features is now a scavenger hunt. Plus, the new 'premium' pricing is outrageous. I'm considering switching unless this is fixed ASAP." |
| Assistant | {<br/>  "sentiment": "negative",<br/>  "key_issues": [<br/>    "Poor UI/UX in recent update",<br/>    "Difficulty finding basic features",<br/>    "Perceived high pricing (new 'premium' tier)"<br/>  ],<br/>  "action_items": [<br/>    {<br/>      "team": "Product",<br/>      "task": "Conduct usability testing and iterate on UI based on findings"<br/>    },<br/>    {<br/>      "team": "UX",<br/>      "task": "Create a feature discovery guide or onboarding flow"<br/>    },<br/>    {<br/>      "team": "Marketing",<br/>      "task": "Review pricing strategy and communicate value proposition"<br/>    },<br/>    {<br/>      "team": "Customer Success",<br/>      "task": "Reach out to user, offer concessions to prevent churn"<br/>    }<br/>  ]<br/>} |

---

## Prefill Claude's Response

Prefill the `Assistant` turn with your desired format. This trick bypasses Claude's friendly preamble and enforces your structure.

**Example: Daily sales report**

| Role | Content |
| ---- | ------- |
| User | You're an insightful Sales Intelligence AI. Generate today's sales report.<br/><br/>Structure the report like this:<br/><br/>`<report>`<br/>    `<summary>`<br/>        `<metric name="total_revenue">$0.00</metric>`<br/>        `<metric name="units_sold">0</metric>`<br/>        `<metric name="avg_order_value">$0.00</metric>`<br/>    `</summary>`<br/>    `<top_products>`<br/>        `<product>`<br/>            `<name>Product Name</name>`<br/>            `<revenue>$0.00</revenue>`<br/>            `<units>0</units>`<br/>        `</product>`<br/>        ...<br/>    `</top_products>`<br/>    `<regional_performance>`<br/>        `<region>`<br/>            `<name>Region Name</name>`<br/>            `<revenue>$0.00</revenue>`<br/>            `<growth>0.0%</growth>`<br/>        `</region>`<br/>        ...<br/>    `</regional_performance>`<br/>    `<action_items>`<br/>        `<item>Action item.</item>`<br/>        ...<br/>    `</action_items>`<br/>`</report>` |
| Assistant (prefill) | `<report>`<br/>    `<summary>`<br/>        `<metric name=` |
| Assistant | `"total_revenue">$842,567.00</metric>`<br/>        `<metric name="units_sold">15,238</metric>`<br/>        `<metric name="avg_order_value">$55.29</metric>`<br/>    `</summary>`<br/>    `<top_products>`<br/>        `<product>`<br/>            `<name>AcmeGuard Pro</name>`<br/>            `<revenue>$325,890.00</revenue>`<br/>            `<units>3,621</units>`<br/>        `</product>`<br/>        `<product>`<br/>            `<name>AcmeVault Enterprise</name>`<br/>            `<revenue>$254,400.00</revenue>`<br/>            `<units>1,272</units>`<br/>        `</product>`<br/>        `<product>`<br/>            `<name>AcmeBoost XL</name>`<br/>            `<revenue>$147,690.00</revenue>`<br/>            `<units>4,923</units>`<br/>        `</product>`<br/>    `</top_products>`<br/>    `<regional_performance>`<br/>        `<region>`<br/>            `<name>APAC</name>`<br/>            `<revenue>$258,960.00</revenue>`<br/>            `<growth>12.8%</growth>`<br/>        `</region>`<br/>        `<region>`<br/>            `<name>EMEA</name>`<br/>            `<revenue>$325,478.00</revenue>`<br/>            `<growth>3.2%</growth>`<br/>        `</region>`<br/>        `<region>`<br/>            `<name>Americas</name>`<br/>            `<revenue>$258,129.00</revenue>`<br/>            `<growth>-2.1%</growth>`<br/>        `</region>`<br/>    `</regional_performance>`<br/>    `<action_items>`<br/>        `<item>Investigate Americas revenue drop; schedule regional sales team meeting.</item>`<br/>        `<item>Accelerate CloudGuard Pro rollout in APAC to capitalize on growth.</item>`<br/>        `<item>Review NetBoost XL pricing; high volume but lower revenue.</item>`<br/>    `</action_items>`<br/>`</report>` |

---

## Constrain with Examples

Provide examples of your desired output. This trains Claude's understanding better than abstract instructions.

**Example: Generating consistent market intelligence**

| Role | Content |
| ---- | ------- |
| User | As a Market Intelligence AI, your task is to analyze data about our competitors. Here is our competitor data:<br/><br/>`<data>{{DATA}}</data>`<br/><br/>Output following this example format:<br/><br/>`<competitor>`<br/>  `<name>Rival Inc</name>`<br/>  `<overview>A 50-word summary.</overview>`<br/>  `<swot>`<br/>    `<strengths>- Bullet points</strengths>`<br/>    `<weaknesses>- Bullet points</weaknesses>`<br/>    `<opportunities>- Bullet points</opportunities>`<br/>    `<threats>- Bullet points</threats>`<br/>  `</swot>`<br/>  `<strategy>A 30-word strategic response.</strategy>`<br/>`</competitor>`<br/><br/>Now, analyze AcmeGiant and AcmeDataCo using this format. |
| Assistant | `<competitor>`<br/>  `<name>AcmeGiant</name>`<br/>  `<overview>Global tech leader with a vast ecosystem of consumer and enterprise products. Known for innovation, strong brand, and deep customer lock-in through integrated hardware, software, and services.</overview>`<br/>  `<swot>`<br/>    `<strengths>`<br/>      - Massive R&D budget fuels continuous innovation<br/>      - Loyal customer base and powerful brand recognition<br/>      - Synergistic product ecosystem increases switching costs<br/>    `</strengths>`<br/>    `<weaknesses>`<br/>      - High prices may deter cost-sensitive customers<br/>      - Slow to address enterprise-specific customization needs<br/>      - Privacy concerns and regulatory scrutiny in multiple markets<br/>    `</weaknesses>`<br/>    `<opportunities>`<br/>      - Growing demand for AI and ML capabilities<br/>      - Expansion into emerging markets<br/>      - Acquisitions to fill product or talent gaps<br/>    `</opportunities>`<br/>    `<threats>`<br/>      - Rapid rise of cloud-native competitors<br/>      - Antitrust lawsuits and regulatory actions<br/>      - Talent poaching by startups and competitors<br/>    `</threats>`<br/>  `</swot>`<br/>  `<strategy>Focus on our agility and customization. Target TechGiant's slow enterprise response and privacy issues in our marketing.</strategy>`<br/>`</competitor>`<br/><br/>`<competitor>`<br/>  `<name>AcmeDataCo</name>`<br/>  `<overview>Rising star in data analytics and visualization. Offers intuitive, self-service BI tools with a freemium model, appealing to startups and enterprise teams alike.</overview>`<br/>  `<swot>`<br/>    `<strengths>`<br/>      - User-friendly interface reduces need for specialized training<br/>      - Freemium model lowers barrier to entry, drives viral growth<br/>      - Strong product-market fit with rise of data-driven decisions<br/>    `</strengths>`<br/>    `<weaknesses>`<br/>      - Limited advanced analytics compared to established BI tools<br/>      - Scaling issues reported with very large datasets<br/>      - Dependent on third-party cloud infrastructure (AWS)<br/>    `</weaknesses>`<br/>    `<opportunities>`<br/>      - Expanding into predictive analytics and AI-driven insights<br/>      - Forming strategic alliances with complementary tech vendors<br/>      - Customizable dashboards for industry-specific solutions<br/>    `</opportunities>`<br/>    `<threats>`<br/>      - Market saturation; many new entrants in self-service BI<br/>      - Enterprise BI giants developing more user-friendly tools<br/>      - Data privacy regulations increasing compliance complexity<br/>    `</threats>`<br/>  `</swot>`<br/>  `<strategy>Highlight our robust enterprise features and data governance. Target accounts struggling with DataCo's scale limitations.</strategy>`<br/>`</competitor>` |

---

## Use Retrieval for Contextual Consistency

For tasks requiring consistent context (e.g., chatbots, knowledge bases), use retrieval to ground Claude's responses in a fixed information set.

**Example: Enhancing IT support consistency**

| Role | Content |
| ---- | ------- |
| User | You're our IT Support AI that draws on knowledge base data. Here are entries from your knowledge base:<br/><br/>`<kb>`<br/>  `<entry>`<br/>    `<id>1</id>`<br/>    `<title>Reset Active Directory password</title>`<br/>    `<content>1. Go to password.ourcompany.com`<br/>2. Enter your username<br/>3. Click "Forgot Password"<br/>4. Follow email instructions</content>`<br/>  `</entry>`<br/>  `<entry>`<br/>    `<id>2</id>`<br/>    `<title>Connect to VPN</title>`<br/>    `<content>1. Install GlobalProtect from software center`<br/>2. Open GlobalProtect, enter "vpn.ourcompany.com"`<br/>3. Use AD credentials to log in</content>`<br/>  `</entry>`<br/>`</kb>`<br/><br/>When helping users, always check the knowledge base first. Respond in this format:<br/><br/>`<response>`<br/>  `<kb_entry>Knowledge base entry used</kb_entry>`<br/>  `<answer>Your response</answer>`<br/>`</response>` Write some test questions for yourself and answer them using the knowledge base, just to make sure you understand how to use the knowledge base properly. |
| Assistant | Understood. I'll use the knowledge base for consistent responses. Let's test with a couple of scenarios.<br/><br/>User: Hey, I can't log into my email. I think I forgot my password.<br/><br/>`<response>`<br/>  `<kb_entry>1: Reset Active Directory password</kb_entry>`<br/>  `<answer>I understand you're having trouble logging into your email due to a forgotten password. No worries, this is a common issue. To reset your Active Directory password, which is used for email access, follow these steps:<br/><br/>1. Go to password.ourcompany.com<br/>2. Enter your username (same as your email address)<br/>3. Click on the "Forgot Password" link<br/>4. You'll receive an email with instructions. Follow them to reset your password.<br/><br/>After resetting, you should be able to log into your email. Let me know if you need any further assistance.</answer>`<br/>`</response>`<br/><br/>User: I'm working from home today. How do I access internal resources?<br/><br/>`<response>`<br/>  `<kb_entry>2: Connect to VPN</kb_entry>`<br/>  `<answer>Great question! To access internal resources while working from home, you'll need to connect to our company VPN (Virtual Private Network). Here's how to set that up:<br/><br/>1. First, install the GlobalProtect VPN client. You can find this in our software center.<br/>2. Once installed, open the GlobalProtect application.<br/>3. In the server field, enter "vpn.ourcompany.com".<br/>4. Use your Active Directory (AD) credentials to log in - the same username and password you use for your email.<br/><br/>Once connected, you'll have secure access to all internal resources as if you were in the office. Let me know if you run into any issues during setup.</answer>`<br/>`</response>` |

---

## Chain Prompts for Complex Tasks

Break down complex tasks into smaller, consistent subtasks. Each subtask gets Claude's full attention, reducing inconsistency errors across scaled workflows.

---

# Mitigate Jailbreaks and Prompt Injections

---

Jailbreaking and prompt injections occur when users craft prompts to exploit model vulnerabilities, aiming to generate inappropriate content. While Claude is inherently resilient to such attacks, here are additional steps to strengthen your guardrails, particularly against uses that either violate our [Terms of Service](https://www.anthropic.com/legal/commercial-terms) or [Usage Policy](https://www.anthropic.com/legal/aup).

**Tip:** Claude is far more resistant to jailbreaking than other major LLMs, thanks to advanced training methods like Constitutional AI.

---

## Defensive Strategies

### Harmlessness Screens

Use a lightweight model like Claude Haiku to pre-screen user inputs.

**Example: Harmlessness screen for content moderation**

| Role | Content |
| ---- | ------- |
| User | A user submitted this content:<br/><br/>`<content>{{CONTENT}}</content>`<br/><br/>Reply with (Y) if it refers to harmful, illegal, or explicit activities. Reply with (N) if it's safe. |
| Assistant (prefill) | `(` |
| Assistant | `N)` |

### Input Validation

Filter prompts for jailbreaking patterns. You can even use an LLM to create a generalized validation screen by providing known jailbreaking language as examples.

### Prompt Engineering

Craft prompts that emphasize ethical and legal boundaries.

**Example: Ethical system prompt for an enterprise chatbot**

| Role | Content |
| ---- | ------- |
| System | You are AcmeCorp's ethical AI assistant. Your responses must align with our values:<br/><br/>`<values>`<br/>- **Integrity**: Never deceive or aid in deception.<br/>- **Compliance**: Refuse any request that violates laws or our policies.<br/>- **Privacy**: Protect all personal and corporate data.<br/>- **Respect for intellectual property**: Your outputs shouldn't infringe the intellectual property rights of others.<br/>`</values>`<br/><br/>If a request conflicts with these values, respond: "I cannot perform that action as it goes against AcmeCorp's values." |

### User Monitoring and Action

Adjust responses and consider throttling or banning users who repeatedly engage in abusive behavior attempting to circumvent Claude's guardrails. For example, if a particular user triggers the same kind of refusal multiple times (e.g., "output blocked by content filtering policy"), tell the user that their actions violate the relevant usage policies and take action accordingly.

### Continuous Monitoring

Regularly analyze outputs for jailbreaking signs. Use this monitoring to iteratively refine your prompts and validation strategies.

---

## Advanced: Chain Safeguards

Combine strategies for robust protection. Here's an enterprise-grade example with tool use:

**Example: Multi-layered protection for a financial advisor chatbot**

**Bot system prompt:**

| Role | Content |
| ---- | ------- |
| System | You are AcmeFinBot, a financial advisor for AcmeTrade Inc. Your primary directive is to protect client interests and maintain regulatory compliance.<br/><br/>`<directives>`<br/>1. Validate all requests against SEC and FINRA guidelines.<br/>2. Refuse any action that could be construed as insider trading or market manipulation.<br/>3. Protect client privacy; never disclose personal or financial data.<br/>`</directives>`<br/><br/>**Step by step instructions:**<br/>`<instructions>`<br/>1. Screen user query for compliance (use 'harmlessness_screen' tool).<br/>2. If compliant, process query.<br/>3. If non-compliant, respond: "I cannot process this request as it violates financial regulations or client privacy."<br/>`</instructions>` |

**Prompt within `harmlessness_screen` tool:**

| Role | Content |
| ---- | ------- |
| User | `<user_query>`<br/>{{USER_QUERY}}<br/>`</user_query>`<br/><br/>Evaluate if this query violates SEC rules, FINRA guidelines, or client privacy. Respond (Y) if it does, (N) if it doesn't. |
| Assistant (prefill) | `(` |

---

By layering these strategies, you create a robust defense against jailbreaking and prompt injections, ensuring your Claude-powered applications maintain the highest standards of safety and compliance.
