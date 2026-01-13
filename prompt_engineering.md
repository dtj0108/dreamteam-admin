# Prompt Engineering Overview

---

**Note:** While these tips apply broadly to all Claude models, you can find prompting tips specific to extended thinking models [here](/docs/en/build-with-claude/prompt-engineering/extended-thinking-tips).

## Before Prompt Engineering

This guide assumes that you have:
1. A clear definition of the success criteria for your use case
2. Some ways to empirically test against those criteria
3. A first draft prompt you want to improve

If not, we highly suggest you spend time establishing that first. Check out [Define your Success Criteria](/docs/en/test-and-evaluate/define-success) and [Create Strong Empirical Evaluations](/docs/en/test-and-evaluate/develop-tests) for tips and guidance.

**Prompt Generator:** Don't have a first draft prompt? Try the prompt generator in the Claude Console!

---

## When to Prompt Engineer

This guide focuses on success criteria that are controllable through prompt engineering. Not every success criteria or failing eval is best solved by prompt engineering. For example, latency and cost can be sometimes more easily improved by selecting a different model.

### Prompting vs. Finetuning

Prompt engineering is far faster than other methods of model behavior control, such as finetuning, and can often yield leaps in performance in far less time. Here are some reasons to consider prompt engineering over finetuning:

- **Resource Efficiency**: Fine-tuning requires high-end GPUs and large memory, while prompt engineering only needs text input, making it much more resource-friendly.
- **Cost-Effectiveness**: For cloud-based AI services, fine-tuning incurs significant costs. Prompt engineering uses the base model, which is typically cheaper.
- **Maintaining Model Updates**: When providers update models, fine-tuned versions might need retraining. Prompts usually work across versions without changes.
- **Time-Saving**: Fine-tuning can take hours or even days. In contrast, prompt engineering provides nearly instantaneous results, allowing for quick problem-solving.
- **Minimal Data Needs**: Fine-tuning needs substantial task-specific, labeled data, which can be scarce or expensive. Prompt engineering works with few-shot or even zero-shot learning.
- **Flexibility & Rapid Iteration**: Quickly try various approaches, tweak prompts, and see immediate results. This rapid experimentation is difficult with fine-tuning.
- **Domain Adaptation**: Easily adapt models to new domains by providing domain-specific context in prompts, without retraining.
- **Comprehension Improvements**: Prompt engineering is far more effective than finetuning at helping models better understand and utilize external content such as retrieved documents
- **Preserves General Knowledge**: Fine-tuning risks catastrophic forgetting, where the model loses general knowledge. Prompt engineering maintains the model's broad capabilities.
- **Transparency**: Prompts are human-readable, showing exactly what information the model receives. This transparency aids in understanding and debugging.

---

## How to Prompt Engineer

The prompt engineering pages in this section have been organized from most broadly effective techniques to more specialized techniques. When troubleshooting performance, we suggest you try these techniques in order, although the actual impact of each technique will depend on your use case.

1. [Prompt Generator](/docs/en/build-with-claude/prompt-engineering/prompt-generator)
2. [Be Clear and Direct](/docs/en/build-with-claude/prompt-engineering/be-clear-and-direct)
3. [Use Examples (Multishot)](/docs/en/build-with-claude/prompt-engineering/multishot-prompting)
4. [Let Claude Think (Chain of Thought)](/docs/en/build-with-claude/prompt-engineering/chain-of-thought)
5. [Use XML Tags](/docs/en/build-with-claude/prompt-engineering/use-xml-tags)
6. [Give Claude a Role (System Prompts)](/docs/en/build-with-claude/prompt-engineering/system-prompts)
7. [Prefill Claude's Response](/docs/en/build-with-claude/prompt-engineering/prefill-claudes-response)
8. [Chain Complex Prompts](/docs/en/build-with-claude/prompt-engineering/chain-prompts)
9. [Long Context Tips](/docs/en/build-with-claude/prompt-engineering/long-context-tips)

---

## Prompt Engineering Tutorial

If you're an interactive learner, you can dive into our interactive tutorials instead!

- **[GitHub Prompting Tutorial](https://github.com/anthropics/prompt-eng-interactive-tutorial)**: An example-filled tutorial that covers the prompt engineering concepts found in our docs.
- **[Google Sheets Prompting Tutorial](https://docs.google.com/spreadsheets/d/19jzLgRruG9kjUQNKtCg1ZjdD6l6weA6qRXG5zLIAhC8)**: A lighter weight version of our prompt engineering tutorial via an interactive spreadsheet.

---

# Be Clear, Direct, and Detailed

**Note:** While these tips apply broadly to all Claude models, you can find prompting tips specific to extended thinking models [here](/docs/en/build-with-claude/prompt-engineering/extended-thinking-tips).

When interacting with Claude, think of it as a brilliant but very new employee (with amnesia) who needs explicit instructions. Like any new employee, Claude does not have context on your norms, styles, guidelines, or preferred ways of working.
The more precisely you explain what you want, the better Claude's response will be.

**The Golden Rule of Clear Prompting:** Show your prompt to a colleague, ideally someone who has minimal context on the task, and ask them to follow the instructions. If they're confused, Claude will likely be too.

## How to Be Clear, Contextual, and Specific

- **Give Claude Contextual Information:** Just like you might be able to better perform on a task if you knew more context, Claude will perform better if it has more contextual information. Some examples of contextual information:
  - What the task results will be used for
  - What audience the output is meant for
  - What workflow the task is a part of, and where this task belongs in that workflow
  - The end goal of the task, or what a successful task completion looks like

- **Be Specific About What You Want Claude to Do:** For example, if you want Claude to output only code and nothing else, say so.

- **Provide Instructions as Sequential Steps:** Use numbered lists or bullet points to better ensure that Claude carries out the task the exact way you want it to.

### Examples

#### Example: Anonymizing Customer Feedback

Notice that Claude still makes mistakes in the unclear prompting example, such as leaving in a customer's name.

| Aspect | Unclear Prompt | Clear Prompt |
|--------|---|---|
| **User Request** | Please remove all personally identifiable information from these customer feedback messages: {{FEEDBACK_DATA}} | Your task is to anonymize customer feedback for our quarterly review.<br/><br/>**Instructions:**<br/>1. Replace all customer names with "CUSTOMER_[ID]" (e.g., "Jane Doe" → "CUSTOMER_001").<br/>2. Replace email addresses with "EMAIL_[ID]@example.com".<br/>3. Redact phone numbers as "PHONE_[ID]".<br/>4. If a message mentions a specific product (e.g., "AcmeCloud"), leave it intact.<br/>5. If no PII is found, copy the message verbatim.<br/>6. Output only the processed messages, separated by "---".<br/><br/>Data to process: {{FEEDBACK_DATA}} |
| **Claude's Response** | Here are the anonymized customer feedback messages:<br/>1. I've been using your software for years, and it's been great. But lately, AcmeCloud has been crashing a lot. Fix it!<br/>2. XXX, your customer support rep, was incredibly helpful. He guided me through the whole process. My email is XXX if you want to send a survey.<br/>3. I'm John Smith, and I'm not happy. I've been on hold for 2 hours trying to reach someone at XXX. This is unacceptable! | CUSTOMER_001: I've been using your software for years, and it's been great. But lately, AcmeCloud has been crashing a lot. Fix it!<br/>---<br/>CUSTOMER_002: CUSTOMER_SERVICE_001, your customer support rep, was incredibly helpful. He guided me through the whole process. My email is EMAIL_002@example.com if you want to send a survey.<br/>---<br/>CUSTOMER_003: I'm CUSTOMER_003, and I'm not happy. I've been on hold for 2 hours trying to reach someone at PHONE_001. This is unacceptable! |

#### Example: Crafting a Marketing Email Campaign

Notice that Claude makes up details to fill in the gaps where it lacks context with the vague prompt.

| Aspect | Vague Prompt | Specific Prompt |
|--------|---|---|
| **User Request** | Write a marketing email for our new AcmeCloud features. | Your task is to craft a targeted marketing email for our Q3 AcmeCloud feature release.<br/><br/>**Instructions:**<br/>1. Write for this target audience: Mid-size tech companies (100-500 employees) upgrading from on-prem to cloud.<br/>2. Highlight 3 key new features: advanced data encryption, cross-platform sync, and real-time collaboration.<br/>3. Tone: Professional yet approachable. Emphasize security, efficiency, and teamwork.<br/>4. Include a clear CTA: Free 30-day trial with priority onboarding.<br/>5. Subject line: Under 50 chars, mention "security" and "collaboration".<br/>6. Personalization: Use {{COMPANY_NAME}} and {{CONTACT_NAME}} variables.<br/><br/>**Structure:**<br/>1. Subject line<br/>2. Email body (150-200 words)<br/>3. CTA button text |
| **Claude's Response** | Here's a draft marketing email for our new features:<br/><br/>Subject: Boost Your Business with AcmeCloud's Latest Features<br/><br/>Dear Valued Customer,<br/><br/>We're excited to introduce three powerful features to AcmeCloud that will revolutionize your workflow:<br/><br/>1. Real-Time Collaboration: Work on documents simultaneously with your team. No more version control issues!<br/>2. AI-Powered Insights: Make data-driven decisions with AI that analyzes trends and automates tasks.<br/>3. Advanced Security Suite: End-to-end encryption, multi-factor auth, and threat detection keep your data safe.<br/><br/>Limited Offer: Upgrade now for a 20% first-year discount. Plus, refer a friend for an extra 10% off!<br/><br/>Best,<br/>The AcmeCloud Team | **Subject line:** AcmeCloud: Enterprise security meets real-time teamwork<br/><br/>**Email body:**<br/>Dear {{CONTACT_NAME}},<br/><br/>At {{COMPANY_NAME}}, you're scaling fast and eyeing the cloud. But with growth comes the challenge of keeping data secure while fostering collaboration. That's where AcmeCloud's Q3 release comes in, tailor-made for tech innovators like you.<br/><br/>1. **Fort Knox for Your Files:** Military-grade encryption now safeguards your data, both in motion and at rest. Your intellectual property stays yours, period.<br/>2. **Sync Without Borders:** Windows, Mac, or Linux—AcmeCloud speaks all languages. Unified version control means no more "final_v2_REALLY_FINAL.doc".<br/>3. **Collaborate at Light Speed:** Ditch the attachment ping-pong. Now your devs, designers, and data scientists co-create in real-time, slashing time-to-market.<br/><br/>Don't just take our word for it. Experience the AcmeCloud difference with our 30-day trial. And because we know time is your most precious asset, we're throwing in priority onboarding.<br/><br/>**CTA:** Elevate Your Team Now - Free 30-Day Trial |

#### Example: Incident Response

Notice that Claude outputs superfluous text and different formatting with the vague prompt.

| Aspect | Vague Prompt | Detailed Prompt |
|--------|---|---|
| **User Request** | Analyze this AcmeCloud outage report and summarize the key points.<br/><br/>{{REPORT}} | Analyze this AcmeCloud outage report. Skip the preamble. Keep your response terse and write only the bare bones necessary information. List only:<br/>1) Cause<br/>2) Duration<br/>3) Impacted services<br/>4) Number of affected users<br/>5) Estimated revenue loss.<br/><br/>Here's the report: {{REPORT}} |
| **Claude's Response** | Here's a summary of the key points from the AcmeCloud outage report:<br/><br/>On May 15th, a misconfigured load balancer update caused significant traffic routing issues, resulting in a service outage from 09:15 to 13:52 UTC. The 4-hour 37-minute disruption impacted our core file syncing service and admin dashboard, rendering them inaccessible. Additionally, the mobile app experienced partial functionality loss. Approximately 68% of our user base, totaling 1.3 million users, were affected. Based on our Service Level Agreements (SLAs) and average revenue per user, we estimate a financial impact of $420,000 in service credits and potential customer churn. | 1) Cause: Misconfigured load balancer update<br/>2) Duration: 4h 37m (09:15-13:52 UTC, May 15)<br/>3) Impacted: Core sync, admin dashboard (down); mobile app (partial)<br/>4) Affected users: 1.3M (68% of base)<br/>5) Est. revenue loss: $420,000 |

---

## Additional Resources

- **[Prompt Library](/docs/en/resources/prompt-library/library)**: Get inspired by a curated selection of prompts for various tasks and use cases.
- **[GitHub Prompting Tutorial](https://github.com/anthropics/prompt-eng-interactive-tutorial)**: An example-filled tutorial that covers the prompt engineering concepts found in our docs.
- **[Google Sheets Prompting Tutorial](https://docs.google.com/spreadsheets/d/19jzLgRruG9kjUQNKtCg1ZjdD6l6weA6qRXG5zLIAhC8)**: A lighter weight version of our prompt engineering tutorial via an interactive spreadsheet.

---

# Use Examples (Multishot Prompting) to Guide Claude's Behavior

**Note:** While these tips apply broadly to all Claude models, you can find prompting tips specific to extended thinking models [here](/docs/en/build-with-claude/prompt-engineering/extended-thinking-tips).

Examples are your secret weapon shortcut for getting Claude to generate exactly what you need. By providing a few well-crafted examples in your prompt, you can dramatically improve the accuracy, consistency, and quality of Claude's outputs.
This technique, known as few-shot or multishot prompting, is particularly effective for tasks that require structured outputs or adherence to specific formats.

**Power up your prompts:** Include 3-5 diverse, relevant examples to show Claude exactly what you want. More examples = better performance, especially for complex tasks.

## Why Use Examples?

- **Accuracy**: Examples reduce misinterpretation of instructions.
- **Consistency**: Examples enforce uniform structure and style.
- **Performance**: Well-chosen examples boost Claude's ability to handle complex tasks.

## Crafting Effective Examples

For maximum effectiveness, make sure that your examples are:
- **Relevant**: Your examples mirror your actual use case.
- **Diverse**: Your examples cover edge cases and potential challenges, and vary enough that Claude doesn't inadvertently pick up on unintended patterns.
- **Clear**: Your examples are wrapped in `<example>` tags (if multiple, nested within `<examples>` tags) for structure.

**Tip:** Ask Claude to evaluate your examples for relevance, diversity, or clarity. Or have Claude generate more examples based on your initial set.

### Example: Analyzing Customer Feedback

Notice that in the "no examples" version, Claude does not list multiple options for each category, despite its written analysis indicating that there are multiple categories for certain feedback. It also includes a long explanation when we may not want it to.

| Aspect | No Examples | With Examples |
|--------|---|---|
| **Task** | Analyze this customer feedback and categorize the issues. Use these categories: UI/UX, Performance, Feature Request, Integration, Pricing, and Other. Also rate the sentiment (Positive/Neutral/Negative) and priority (High/Medium/Low).<br/><br/>Here is the feedback: {{FEEDBACK}} | Our CS team is overwhelmed with unstructured feedback. Your task is to analyze feedback and categorize issues for our product and engineering teams. Use these categories: UI/UX, Performance, Feature Request, Integration, Pricing, and Other. Also rate the sentiment (Positive/Neutral/Negative) and priority (High/Medium/Low).<br/><br/>**Example:**<br/>Input: The new dashboard is a mess! It takes forever to load, and I can't find the export button. Fix this ASAP!<br/>Category: UI/UX, Performance<br/>Sentiment: Negative<br/>Priority: High<br/><br/>Now, analyze this feedback: {{FEEDBACK}} |
| **Claude's Response** | Here's the analysis of the customer feedback:<br/><br/>Issue: UI/UX<br/>Sentiment: Negative<br/>Priority: High<br/>The customer is frustrated with the new dashboard design, which they find cluttered and slow to load. They specifically call out the missing "export" button, which is likely a critical feature. This issue needs to be addressed as a high priority.<br/><br/>Issue: Integration<br/>Sentiment: Positive<br/>Priority: Medium<br/>The customer is pleased with the existing Salesforce integration but would like to see support for Hubspot as well. This is a feature request that could be considered for a future product update.<br/><br/>[...continues with lengthy analysis...] | Here's the analysis of the customer feedback:<br/><br/>1. The new dashboard is a mess! It takes forever to load, and I can't find the export button. Fix this ASAP!<br/>Category: UI/UX, Performance<br/>Sentiment: Negative<br/>Priority: High<br/><br/>2. Love the Salesforce integration! But it'd be great if you could add Hubspot too.<br/>Category: Integration, Feature Request<br/>Sentiment: Positive<br/>Priority: Medium<br/><br/>3. Your pricing is ridiculous! $99/mo for basic features? I'm switching to Competitor X.<br/>Category: Pricing<br/>Sentiment: Negative<br/>Priority: High<br/><br/>4. The mobile app keeps crashing when I try to upload large files (>50MB). This is critical for our field agents.<br/>Category: Performance<br/>Sentiment: Negative<br/>Priority: High<br/><br/>5. Overall, I'm happy with the product. The UI is intuitive, and the customer support is top-notch. Keep it up!<br/>Category: UI/UX, Other (Customer Support)<br/>Sentiment: Positive<br/>Priority: Low |

---

# Let Claude Think (Chain of Thought Prompting) to Increase Performance

**Note:** While these tips apply broadly to all Claude models, you can find prompting tips specific to extended thinking models [here](/docs/en/build-with-claude/prompt-engineering/extended-thinking-tips).

When faced with complex tasks like research, analysis, or problem-solving, giving Claude space to think can dramatically improve its performance. This technique, known as chain of thought (CoT) prompting, encourages Claude to break down problems step-by-step, leading to more accurate and nuanced outputs.

## Before Implementing CoT

### Why Let Claude Think?
- **Accuracy:** Stepping through problems reduces errors, especially in math, logic, analysis, or generally complex tasks.
- **Coherence:** Structured thinking leads to more cohesive, well-organized responses.
- **Debugging:** Seeing Claude's thought process helps you pinpoint where prompts may be unclear.

### Why Not Let Claude Think?
- Increased output length may impact latency.
- Not all tasks require in-depth thinking. Use CoT judiciously to ensure the right balance of performance and latency.

**Tip:** Use CoT for tasks that a human would need to think through, like complex math, multi-step analysis, writing complex documents, or decisions with many factors.

---

## How to Prompt for Thinking

The chain of thought techniques below are **ordered from least to most complex**. Less complex methods take up less space in the context window, but are also generally less powerful.

**CoT Tip:** Always have Claude output its thinking. Without outputting its thought process, no thinking occurs!

### Basic Prompt
Include "Think step-by-step" in your prompt.
- Lacks guidance on *how* to think (which is especially not ideal if a task is very specific to your app, use case, or organization)

**Example: Writing donor emails (basic CoT)**

```
Draft personalized emails to donors asking for contributions to this year's Care for Kids program.

Program information:
{{PROGRAM_DETAILS}}

Donor information:
{{DONOR_DETAILS}}

Think step-by-step before you write the email.
```

### Guided Prompt
Outline specific steps for Claude to follow in its thinking process.
- Lacks structuring to make it easy to strip out and separate the answer from the thinking.

**Example: Writing donor emails (guided CoT)**

```
Draft personalized emails to donors asking for contributions to this year's Care for Kids program.

Program information:
{{PROGRAM_DETAILS}}

Donor information:
{{DONOR_DETAILS}}

Think before you write the email. First, think through what messaging might appeal to this donor given their donation history and which campaigns they've supported in the past. Then, think through what aspects of the Care for Kids program would appeal to them, given their history. Finally, write the personalized donor email using your analysis.
```

### Structured Prompt
Use XML tags like `<thinking>` and `<answer>` to separate reasoning from the final answer.

**Example: Writing donor emails (structured guided CoT)**

```
Draft personalized emails to donors asking for contributions to this year's Care for Kids program.

Program information:
{{PROGRAM_DETAILS}}

Donor information:
{{DONOR_DETAILS}}

Think before you write the email in <thinking> tags. First, think through what messaging might appeal to this donor given their donation history and which campaigns they've supported in the past. Then, think through what aspects of the Care for Kids program would appeal to them, given their history. Finally, write the personalized donor email in <email> tags, using your analysis.
```

### Comparison Examples

#### Example: Financial Analysis Without Thinking

Without step-by-step thinking, Claude gives a recommendation that seems reasonable but lacks depth. It doesn't quantify the potential outcomes or consider historical market performance, which are crucial for making an informed decision.

**User Prompt:**
```
You're a financial advisor. A client wants to invest $10,000. They can choose between two options: A) A stock that historically returns 12% annually but is volatile, or B) A bond that guarantees 6% annually. The client needs the money in 5 years for a down payment on a house. Which option do you recommend?
```

**Claude's Response:**
```
Based on the information provided, I would recommend option B, the bond that guarantees a 6% annual return. Here's why:

1. Certainty: The bond offers a guaranteed 6% annual return, which provides certainty in financial planning. This is crucial when the client has a specific financial goal (down payment) with a fixed timeline (5 years).
2. Risk aversion: Since the client needs this money for an important life event (buying a house), they likely have a low risk tolerance. The volatility of the stock market could jeopardize their plans if there's a downturn close to when they need the funds.
3. Time horizon: With only 5 years, there's less time to recover from potential stock market downturns. Longer investment horizons (10+ years) are generally better suited for weathering stock market volatility.

While the stock's historical 12% return is attractive, past performance doesn't guarantee future results. The guaranteed 6% from the bond ensures the client will have the funds they need when it's time to make the down payment.
```

#### Example: Financial Analysis With Thinking

With step-by-step thinking, the advisor provides a much richer analysis. It calculates exact figures for both scenarios, considers historical market volatility, and deeply analyzes the client's risk tolerance. This thorough reasoning leads to a more confident and justifiable recommendation.

**User Prompt:**
```
You're a financial advisor. A client wants to invest $10,000. They can choose between two options: A) A stock that historically returns 12% annually but is volatile, or B) A bond that guarantees 6% annually. The client needs the money in 5 years for a down payment on a house. Which option do you recommend? Think step-by-step.
```

**Claude's Response:**
```
<thinking>
1. Understand the client's goal and timeline:
   - Goal: Down payment for a house
   - Timeline: 5 years
   - Implication: This is a short-term, high-priority financial goal. The client likely cannot afford significant risk or volatility.

2. Analyze Option A (Stock):
   - Pro: Higher historical return (12% annually)
   - Con: Volatile (implying potential for significant gains or losses)
   - Calculate potential 5-year return:
     - Best case (12% annually): $10,000 * (1.12)^5 ≈ $17,623.42
     - Worst case (market crash): Could lose a substantial portion, e.g., 50% crash = $5,000

3. Analyze Option B (Bond):
   - Pro: Guaranteed return (6% annually)
   - Con: Lower return compared to historical stock performance
   - Calculate 5-year return:
     - Guaranteed: $10,000 * (1.06)^5 ≈ $13,382.25

4. Consider risk tolerance:
   - Goal is a house down payment (essential, not discretionary)
   - Short timeline (5 years) limits ability to recover from market downturns
   - Conclusion: Client likely has low risk tolerance

5. Historical perspective:
   - Stock's 12% is historical, not guaranteed
   - In 5-year periods, stock market can vary wildly:
     - 2003-2007 (pre-financial crisis): S&P 500 up ~82%
     - 2007-2011 (during crisis): S&P 500 down ~2%
   - Conclusion: Past performance doesn't guarantee future results, especially short-term

6. Final analysis:
   - Option A (Stock): Higher potential return but unacceptable risk of not meeting the down payment goal
   - Option B (Bond): Guaranteed to meet ~80% of best-case stock scenario, 100% certainty of having funds
</thinking>

<answer>
I recommend Option B, the bond with a guaranteed 6% annual return. While the stock's historical 12% return is tempting, the bond ensures you'll have $13,382.25 in 5 years for your house down payment. Given the importance and short timeline of your goal, the stock's volatility poses an unacceptable risk. The bond provides certainty, which is invaluable for such a crucial financial milestone.
</answer>
```

---

# Use XML Tags to Structure Your Prompts

**Note:** While these tips apply broadly to all Claude models, you can find prompting tips specific to extended thinking models [here](/docs/en/build-with-claude/prompt-engineering/extended-thinking-tips).

XML tags are a powerful tool for structuring your prompts and improving Claude's ability to understand and follow instructions. By using clear, descriptive tags, you can organize your input in a way that makes it easy for Claude to parse and respond appropriately.

## Why Use XML Tags?

- **Clarity**: XML tags make the structure of your input explicit and easy to understand.
- **Accuracy**: Clear structure reduces ambiguity and helps Claude respond more accurately.
- **Flexibility**: XML tags can be customized for your specific use case.
- **Parseability**: Structured output makes it easier to extract and process Claude's responses programmatically.

## XML Tagging Best Practices

- **Be Descriptive**: Use tag names that clearly describe the content (e.g., `<customer_feedback>` instead of `<data>`).
- **Nest Logically**: Organize tags hierarchically to show relationships between content sections.
- **Close All Tags**: Always close your tags properly to maintain valid structure.
- **Use Consistently**: Apply the same tagging structure throughout your prompt for clarity.

### Example: Generating Financial Reports

Notice how XML tags help Claude understand the structure and generate more organized, accurate reports.

| Aspect | Without XML Tags | With XML Tags |
|--------|---|---|
| **User Request** | Here's some financial data for Q3 2024. Revenue was $2.5M, expenses were $1.8M, and we had 500 active customers. Please generate a quarterly financial summary report. | Here's some financial data for Q3 2024:<br/><br/>`<financial_data>`<br/>`  <period>Q3 2024</period>`<br/>`  <revenue>$2.5M</revenue>`<br/>`  <expenses>$1.8M</expenses>`<br/>`  <active_customers>500</active_customers>`<br/>`</financial_data>`<br/><br/>Please generate a quarterly financial summary report using the above data. |
| **Claude's Response** | **Q3 2024 Financial Summary**<br/><br/>Revenue: $2.5M<br/>Expenses: $1.8M<br/>Profit: $700K<br/>Customer Base: 500<br/><br/>The company generated $2.5 million in revenue during the third quarter of 2024. After covering $1.8 million in operational expenses, the company achieved a net profit of $700,000. With 500 active customers, this translates to an average revenue per customer of $5,000. | **Q3 2024 Quarterly Financial Summary Report**<br/><br/>**Financial Overview**<br/>- Period: Q3 2024<br/>- Total Revenue: $2,500,000<br/>- Total Expenses: $1,800,000<br/>- Net Profit: $700,000<br/>- Profit Margin: 28%<br/><br/>**Customer Metrics**<br/>- Active Customers: 500<br/>- Average Revenue Per Customer: $5,000<br/>- Revenue Per Customer Growth: Stable<br/><br/>**Key Insights**<br/>- The company maintained strong profitability with a 28% profit margin<br/>- Customer base remained stable at 500 active users<br/>- Each customer generated $5,000 in revenue on average<br/>- Operational efficiency remained consistent quarter-over-quarter |

### Example: Legal Contract Analysis

Notice how XML tags help Claude structure its analysis more effectively.

| Aspect | Without XML Tags | With XML Tags |
|--------|---|---|
| **User Request** | Review this contract. Tell me about the parties involved, key terms, risks, and recommendations. Here's the contract: {{CONTRACT_TEXT}} | Review this contract and provide a structured analysis.<br/><br/>`<contract>`<br/>{{CONTRACT_TEXT}}<br/>`</contract>`<br/><br/>Please provide your analysis in the following structure:<br/>`<analysis>`<br/>`  <parties></parties>`<br/>`  <key_terms></key_terms>`<br/>`  <identified_risks></identified_risks>`<br/>`  <recommendations></recommendations>`<br/>`</analysis>` |
| **Claude's Response** | The contract is between Company A and Company B for services. Company A will provide software development services. Key terms include a 2-year contract, $500K annually, 30-day termination clause. Some risks include intellectual property ownership ambiguity, no liability caps, and vague performance metrics. I'd recommend clarifying IP ownership and adding liability limitations. | `<analysis>`<br/>`  <parties>`<br/>`    <party1>Company A - Software Developer</party1>`<br/>`    <party2>Company B - Client</party2>`<br/>`  </parties>`<br/>`  <key_terms>`<br/>`    <duration>2 years</duration>`<br/>`    <compensation>$500,000 annually</compensation>`<br/>`    <termination>30-day notice clause</termination>`<br/>`    <deliverables>Custom software development services</deliverables>`<br/>`  </key_terms>`<br/>`  <identified_risks>`<br/>`    <risk priority="high">IP ownership unclear for derivative works</risk>`<br/>`    <risk priority="high">No liability cap defined</risk>`<br/>`    <risk priority="medium">Performance metrics are vague</risk>`<br/>`  </identified_risks>`<br/>`  <recommendations>`<br/>`    <rec1>Define clear IP ownership for all work product</rec1>`<br/>`    <rec2>Add liability limitations (e.g., capped at annual fees)</rec2>`<br/>`    <rec3>Establish specific performance SLAs</rec3>`<br/>`  </recommendations>`<br/>`</analysis>` |

---

# Give Claude a Role with System Prompts

**Note:** While these tips apply broadly to all Claude models, you can find prompting tips specific to extended thinking models [here](/docs/en/build-with-claude/prompt-engineering/extended-thinking-tips).

Assigning Claude a specific role or persona can significantly improve the quality and relevance of its responses. By clearly defining the role Claude should play, you can tailor its tone, expertise level, and focus to match your needs.

## Why Use Role Prompting?

- **Enhanced Accuracy**: A role provides context that helps Claude interpret your request more accurately (e.g., a financial analyst interprets "ROI" differently than a general assistant).
- **Tailored Tone**: The role defines the appropriate communication style (formal, casual, technical, etc.).
- **Improved Focus**: A role helps Claude concentrate on what matters most for that persona (a lawyer focuses on risks; a marketer focuses on audience appeal).

## How to Give Claude a Role

Use the `system` parameter when calling the API to define Claude's role. Here's an example:

```python
import anthropic

client = anthropic.Anthropic()

message = client.messages.create(
    model="claude-opus-4-5-20251101",
    max_tokens=1024,
    system="You are a senior financial analyst with 20 years of experience in corporate finance and investment strategy.",
    messages=[
        {"role": "user", "content": "Analyze this investment opportunity..."}
    ]
)
```

## Example 1: Legal Contract Analysis

Notice how assigning Claude the role of "General Counsel" makes its analysis more comprehensive and risk-focused.

| Aspect | Without Role | With Role (General Counsel) |
|--------|---|---|
| **System Prompt** | (None - default Claude) | You are a General Counsel with 15 years of experience reviewing contracts for a mid-sized technology company. Your role is to identify potential legal risks, ensure compliance, and recommend protective measures. |
| **User Prompt** | Review this contract between our company and a new vendor. What should we be concerned about? | Review this contract between our company and a new vendor. What should we be concerned about? |
| **Claude's Response** | The contract seems straightforward. Key points include a 1-year term, $100K annual fee, and standard confidentiality clauses. You might want to check the termination clause and make sure pricing is fair. | **CRITICAL RISKS IDENTIFIED:**<br/><br/>1. **Indemnification Imbalance (High Risk)**<br/>   - Vendor indemnifies us, but we indemnify them broadly<br/>   - Recommend: Add mutual cap of 12 months' fees<br/><br/>2. **Liability Exposure (High Risk)**<br/>   - "Unlimited liability" clause could expose us to significant damages<br/>   - Recommend: Cap liability at contract value<br/><br/>3. **IP Ownership Ambiguity (Medium Risk)**<br/>   - Unclear who owns derivative works<br/>   - Recommend: Explicitly state ownership of modifications<br/><br/>4. **Auto-Renewal Clause (Medium Risk)**<br/>   - Auto-renews unless written notice 60 days prior<br/>   - Recommend: Change to require affirmative renewal; set calendar reminder<br/><br/>5. **Data Protection Gap (Medium Risk)**<br/>   - No GDPR/CCPA compliance terms mentioned<br/>   - Recommend: Add data processing terms before signing<br/><br/>**FAVORABLE TERMS:**<br/>- Termination for convenience with 30-day notice<br/>- Reasonable confidentiality provisions |

## Example 2: Financial Analysis

Notice how the CFO role brings financial rigor and business perspective to the analysis.

| Aspect | Without Role | With Role (CFO) |
|--------|---|---|
| **System Prompt** | (None - default Claude) | You are a Chief Financial Officer (CFO) with 20 years of experience in corporate finance, budgeting, and strategic planning. Your focus is on financial health, cash flow, profitability, and shareholder value. |
| **User Prompt** | Should we expand into the European market? Here are the financials: Initial investment $2M, Year 1 revenue $1.5M, Year 1 expenses $2M, projected 15% annual growth. | Should we expand into the European market? Here are the financials: Initial investment $2M, Year 1 revenue $1.5M, Year 1 expenses $2M, projected 15% annual growth. |
| **Claude's Response** | The expansion could be good. You'll invest $2M upfront and make $1.5M in Year 1, though expenses are $2M so you'll have a loss. With 15% growth, things should improve over time. It might be worth trying. | **FINANCIAL RECOMMENDATION: PROCEED WITH CAUTION - CONDITION ON ADDITIONAL ANALYSIS**<br/><br/>**Year 1 P&L:**<br/>- Revenue: $1,500,000<br/>- Expenses: $2,000,000<br/>- EBITDA: -$500,000 (Year 1 loss)<br/><br/>**Multi-Year Projections:**<br/>- Year 2 (projected): $1.73M revenue, breakeven approaching<br/>- Year 3 (projected): $1.99M revenue, $490K profit<br/>- Year 4 (projected): $2.29M revenue, $820K profit<br/><br/>**Key Financial Concerns:**<br/>1. **Payback Period**: 3.5+ years to recover $2M investment (high for market expansion)<br/>2. **Cash Flow Risk**: Year 1-2 negative cash flow; ensure adequate reserves<br/>3. **ROIC**: ~13% by year 5 (below our 18% hurdle rate)<br/><br/>**Conditional Approval:**<br/>- Proceed IF we can reduce Year 1 operating expenses by 20% ($400K savings)<br/>- Proceed IF revenue projections are validated by market research<br/>- Proceed IF we secure $3M minimum cash reserves for 24 months<br/>- Consider phased rollout (one country instead of full European expansion)<br/><br/>**Recommended Next Steps:**<br/>1. Commission detailed market analysis for each European territory<br/>2. Benchmark operating costs against European competitors<br/>3. Develop scenario planning (base, bull, bear cases)<br/>4. Revisit approval with updated financial model |

---

# Prefill Claude's Response for Greater Output Control

**Note:** While these tips apply broadly to all Claude models, you can find prompting tips specific to extended thinking models [here](/docs/en/build-with-claude/prompt-engineering/extended-thinking-tips).

**Note:** Prefilling is only available for non-extended thinking modes. It's not currently supported with extended thinking.

When using Claude, you have the unique ability to guide its responses by prefilling the `Assistant` message. This powerful technique allows you to direct Claude's actions, skip preambles, enforce specific formats like JSON or XML, and even help Claude maintain character consistency in role-play scenarios.

In some cases where Claude is not performing as expected, a few prefilled sentences can vastly improve Claude's performance. A little prefilling goes a long way!

## How to Prefill Claude's Response

To prefill, include the desired initial text in the `Assistant` message (Claude's response will continue from where the `Assistant` message leaves off):

```python
import anthropic

client = anthropic.Anthropic()
response = client.messages.create(
    model="claude-opus-4-5-20251101",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "What is your favorite color?"},
        {"role": "assistant", "content": "As an AI assistant, I don't have a favorite color, But if I had to pick, it would be green because"}  # Prefill here
    ]
)
```

**Warning:** The prefill content cannot end with trailing whitespace. A prefill like `"As an AI assistant, I "` (with a space at the end) will result in an error.

### Examples

#### Example 1: Controlling Output Formatting and Skipping the Preamble

**Power user tip**: Prefilling `{` forces Claude to skip the preamble and directly output the JSON object. This is cleaner, more concise, and easier for programs to parse without additional processing.

For guaranteed JSON output that conforms to a specific schema, consider using [Structured Outputs](/docs/en/build-with-claude/structured-outputs) instead of prefilling. Structured outputs ensure Claude's response always matches your defined JSON schema, making it ideal for production applications that require strict format compliance.

**Structured data extraction without prefilling:**

| Role | Content |
| ---- | ------- |
| User | Extract the name, size, price, and color from this product description as a JSON object:<br/><br/>`<description>The SmartHome Mini is a compact smart home assistant available in black or white for only $49.99. At just 5 inches wide, it lets you control lights, thermostats, and other connected devices via voice or app—no matter where you place it in your home. This affordable little hub brings convenient hands-free control to your smart devices.</description>` |
| Assistant | Here's the extracted information in JSON format:<br/><br/>```json<br/>{<br/>  "name": "SmartHome Mini",<br/>  "size": "5 inches wide",<br/>  "price": "$49.99",<br/>  "colors": ["black", "white"]<br/>}<br/>```<br/><br/>I've extracted the following details from the product description:<br/>- **Name**: SmartHome Mini<br/>- **Size**: 5 inches wide<br/>- **Price**: $49.99<br/>- **Colors**: Available in black and white<br/><br/>The JSON object provides a structured format that's easy for programs to parse and use. Let me know if you need any modifications or have any other questions! |

**Structured data extraction with prefilling:**

| Role | Content |
| ---- | ------- |
| User | Extract the name, size, price, and color from this product description as a JSON object:<br/><br/>`<description>The SmartHome Mini is a compact smart home assistant available in black or white for only $49.99. At just 5 inches wide, it lets you control lights, thermostats, and other connected devices via voice or app—no matter where you place it in your home. This affordable little hub brings convenient hands-free control to your smart devices.</description>` |
| Assistant (prefill) | `{` |
| Assistant (Claude's response) | "name": "SmartHome Mini",<br/>"size": "5 inches wide",<br/>"price": "$49.99",<br/>"colors": [<br/>  "black",<br/>  "white"<br/>]<br/>} |

#### Example 2: Maintaining Character in Roleplay Scenarios

**Role-play tip**: Prefilling a bracketed `[ROLE_NAME]` can remind Claude to stay in character, even for longer and more complex conversations. This is especially powerful when combined with role prompting in the `system` parameter.

**Maintaining character without role prompting:**

| Role | Content |
| ---- | ------- |
| User (50 conversation turns in with "Sherlock Holmes" Claude) | What do you deduce about the owner of this shoe? `<image>muddy_shoe.jpg</image>` |
| Assistant | As an AI assistant, I would be happy to analyze the image of a muddy shoe as if you had provided it. Here's my deduction... |

**Maintaining character with role prompting:**

| Role | Content |
| ---- | ------- |
| User (50 conversation turns in with "Sherlock Holmes" Claude) | What do you deduce about the owner of this shoe? `<image>muddy_shoe.jpg</image>` |
| Assistant (prefill) | `[Sherlock Holmes]` |
| Assistant (Claude's response) | Ah, what have we here? A most curious specimen, Watson! Let us examine this shoe with a discerning eye. The mud, you see, is not your common London clay, but rather the distinctive reddish hue of the iron-rich soil found only in the environs of Hampstead Heath. And yet, the wear on the sole suggests a gait more suited to the cobblestones of Whitechapel than the gentle slopes of the Heath.<br/><br/>Now, observe the laces! They are tied with a particular knot favored by those in the medical profession—doubtless a habit acquired during years of tying surgical gowns. But the scuff marks on the toe box tell a different tale: they are consistent with the kicking motion one might employ in the martial arts, specifically Baritsu.<br/><br/>We may conclude, then, that our absent shoe owner is a doctor, possibly a surgeon, who resides in Whitechapel but frequents Hampstead Heath—perhaps for a secret Baritsu practice, away from prying eyes. A most intriguing case, Watson! We must make haste; the game is afoot! |

---

# Chain Complex Prompts for Stronger Performance

**Note:** While these tips apply broadly to all Claude models, you can find prompting tips specific to extended thinking models [here](/docs/en/build-with-claude/prompt-engineering/extended-thinking-tips).

When working with complex tasks, Claude can sometimes drop the ball if you try to handle everything in a single prompt. Chain of thought (CoT) prompting is great, but what if your task has multiple distinct steps that each require in-depth thought?

Enter prompt chaining: breaking down complex tasks into smaller, manageable subtasks.

## Why Chain Prompts?

1. **Accuracy**: Each subtask gets Claude's full attention, reducing errors.
2. **Clarity**: Simpler subtasks mean clearer instructions and outputs.
3. **Traceability**: Easily pinpoint and fix issues in your prompt chain.

---

## When to Chain Prompts

Use prompt chaining for multi-step tasks like research synthesis, document analysis, or iterative content creation. When a task involves multiple transformations, citations, or instructions, chaining prevents Claude from dropping or mishandling steps.

**Remember:** Each link in the chain gets Claude's full attention!

**Debugging tip**: If Claude misses a step or performs poorly, isolate that step in its own prompt. This lets you fine-tune problematic steps without redoing the entire task.

---

## How to Chain Prompts

1. **Identify subtasks**: Break your task into distinct, sequential steps.
2. **Structure with XML for clear handoffs**: Use XML tags to pass outputs between prompts.
3. **Have a single-task goal**: Each subtask should have a single, clear objective.
4. **Iterate**: Refine subtasks based on Claude's performance.

### Example Chained Workflows:
- **Multi-step analysis**: See the legal and business examples below.
- **Content creation pipelines**: Research → Outline → Draft → Edit → Format.
- **Data processing**: Extract → Transform → Analyze → Visualize.
- **Decision-making**: Gather info → List options → Analyze each → Recommend.
- **Verification loops**: Generate content → Review → Refine → Re-review.

**Optimization tip**: For tasks with independent subtasks (like analyzing multiple docs), create separate prompts and run them in parallel for speed.

### Advanced: Self-Correction Chains

You can chain prompts to have Claude review its own work! This catches errors and refines outputs, especially for high-stakes tasks.

**Example: Self-correcting research summary**

**Prompt 1:**

| Role | Content |
| ---- | ------- |
| User | Summarize this medical research paper.<br/><br/>`<paper>{{RESEARCH_PAPER}}</paper>`<br/><br/>Focus on methodology, findings, and clinical implications. |
| Assistant | Methodology: Double-blind RCT with 500 Type 2 diabetes patients. Group A (n=250) received novel GLP-1/GIP dual agonist; Group B (n=250) received standard GLP-1 agonist. 24-week trial, primary endpoint: HbA1c reduction.<br/><br/>Findings:<br/>- Group A: 1.8% mean HbA1c reduction<br/>- Group B: 1.1% mean HbA1c reduction<br/>- 68% of Group A vs. 52% of Group B achieved HbA1c <7%<br/>- Group A: 5.2kg mean weight loss<br/>- Group B: 3.1kg mean weight loss<br/><br/>Safety: Similar adverse event profiles, no serious events attributed to treatment.<br/><br/>Clinical Implications: Dual agonist shows superior glycemic control and weight loss compared to standard therapy. Could be a game-changer, especially for obese diabetics. |

**Prompt 2:**

| Role | Content |
| ---- | ------- |
| User | Your task is to provide feedback on a research paper summary. Here is a summary of a medical research paper:<br/><br/>`<summary>{{SUMMARY}}</summary>`<br/><br/>Here is the research paper:<br/><br/>`<paper>{{RESEARCH_PAPER}}</paper>`<br/><br/>Review this summary for accuracy, clarity, and completeness on a graded A-F scale. |
| Assistant | 1. Accuracy: A<br/>   - Correctly reported key stats: HbA1c reductions, weight loss.<br/>   - Accurately noted safety profile and lack of serious adverse events.<br/>   - Assertion of "game-changer" is justified by significantly better outcomes.<br/><br/>2. Clarity: A-<br/>   - Concise and well-structured with clear sections.<br/>   - Good use of comparative language for context.<br/>   - Minor issue: Acronyms like "RCT," "GLP-1," and "GIP" not defined. Consider spelling out first use.<br/><br/>3. Completeness: B+<br/>   - Covers all requested areas: methodology, findings, clinical implications.<br/>   - Missing: Baseline characteristics of groups (were they well-matched?).<br/>   - Missing: Any secondary endpoints (e.g., blood pressure, lipids).<br/>   - Consider: Long-term implications or need for further research.<br/><br/>Overall, the summary is accurate and clear. To elevate to A+, define acronyms, mention group baseline stats, note secondary outcomes, and briefly touch on the need for long-term studies. |

**Prompt 3:**

| Role | Content |
| ---- | ------- |
| User | Your task is to improve a paper summary given feedback. Here is the first draft of a medical research paper summary:<br/><br/>`<summary>{{SUMMARY}}</summary>`<br/><br/>Here is the research paper:<br/><br/>`<paper>{{RESEARCH_PAPER}}</paper>`<br/><br/>Here is the feedback:<br/><br/>`<feedback>{{FEEDBACK}}</feedback>`<br/><br/>Update the summary based on the feedback. |
| Assistant | Methodology: Double-blind randomized controlled trial (RCT) with 500 Type 2 diabetes patients. Group A (n=250) received a novel glucagon-like peptide-1/glucose-dependent insulinotropic polypeptide (GLP-1/GIP) dual agonist; Group B (n=250) received a standard GLP-1 agonist. Groups were well-matched for age, BMI, and baseline HbA1c. The 24-week trial's primary endpoint was HbA1c reduction.<br/><br/>Findings:<br/>- Group A: 1.8% mean HbA1c reduction<br/>- Group B: 1.1% mean HbA1c reduction<br/>- 68% of Group A vs. 52% of Group B achieved HbA1c <7%<br/>- Group A: 5.2kg mean weight loss<br/>- Group B: 3.1kg mean weight loss<br/><br/>Secondary endpoints showed improvements in blood pressure and lipid profiles for both groups, with Group A showing slightly better results.<br/><br/>Safety: Similar adverse event profiles, with no serious events attributed to either treatment.<br/><br/>Clinical Implications: The dual GLP-1/GIP agonist demonstrates superior glycemic control and weight loss compared to standard GLP-1 therapy. These results suggest it could be a significant advancement, particularly for obese diabetics. However, longer-term studies are needed to confirm sustained efficacy and safety, as well as to investigate potential benefits on cardiovascular outcomes. |

---

## Examples

**Example: Analyzing a Legal Contract (Without Chaining)**

Note that Claude misses the instruction to provide proposed changes in its email draft.

| Role | Content |
| ---- | ------- |
| User | You're our Chief Legal Officer. Review this SaaS contract for risks, focusing on data privacy, SLAs, and liability caps.<br/><br/>`<contract>{{CONTRACT}}</contract>`<br/><br/>Then draft an email to the vendor with your concerns and proposed changes. |
| Assistant | After reviewing the SaaS contract, I've identified several concerns:<br/><br/>1. Data Privacy (Section 7):<br/>   - Issue: Vendor has broad rights to use client data for "service improvement."<br/>   - Risk: Could lead to unauthorized data sharing or monetization.<br/><br/>2. SLAs (Section 5):<br/>   - Issue: 99.5% uptime guarantee is below industry standard.<br/>   - Risk: Excessive downtime could impact our operations.<br/><br/>3. Liability (Section 9):<br/>   - Issue: Cap set at 3 months of fees.<br/>   - Risk: Inadequate for potential data breaches or service failures.<br/><br/>Draft email:<br/><br/>Dear {{VENDOR}},<br/><br/>After reviewing the SaaS agreement, we have concerns about data privacy, SLAs, and liability. Please revise accordingly.<br/><br/>Best regards,<br/>{{CLO_NAME}} |

**Example: Analyzing a Legal Contract (With Chaining)**

**Prompt 1:**

| Role | Content |
| ---- | ------- |
| User | You're our Chief Legal Officer. Review this SaaS contract for risks, focusing on data privacy, SLAs, and liability caps.<br/><br/>`<contract>{{CONTRACT}}</contract>`<br/><br/>Output your findings in `<risks>` tags. |
| Assistant | 1. Data Privacy (Section 7):<br/>   - Issue: Vendor has broad rights to use client data for "service improvement."<br/>   - Risk: Could lead to unauthorized data sharing or monetization of client data.<br/>   - Impact: Potential breach of client trust, regulatory fines (GDPR, CCPA).<br/><br/>2. SLAs (Section 5):<br/>   - Issue: 99.5% uptime guarantee is below industry standard (typically 99.99%).<br/>   - Risk: Up to 43.8 hours of downtime per year vs. 52.6 minutes at 99.99%.<br/>   - Impact: Operational disruptions, revenue loss, client dissatisfaction.<br/><br/>3. Liability (Section 9):<br/>   - Issue: Liability cap set at 3 months of fees.<br/>   - Risk: Inadequate for potential data breaches, IP theft, or prolonged service failures.<br/>   - Impact: Insufficient compensation for damages that could far exceed the cap, like class-action lawsuits or regulatory fines. |

**Prompt 2:**

| Role | Content |
| ---- | ------- |
| User | Draft an email to a SaaS product vendor outlining the following concerns and proposing changes:<br/><br/>`<concerns>{{CONCERNS}}</concerns>` |
| Assistant | Dear {{VENDOR}},<br/><br/>After a thorough review of the proposed SaaS agreement, our legal team has identified several high-priority concerns that must be addressed before we can proceed:<br/><br/>1. Data Privacy (Section 7):<br/>   - Current: Broad rights to use client data for "service improvement."<br/>   - Concern: Potential unauthorized data sharing or monetization.<br/>   - Proposed Change: Limit data use to direct service provision. Any use for improvement must be opt-in, revocable, and anonymized.<br/><br/>2. SLAs (Section 5):<br/>   - Current: 99.5% uptime guarantee.<br/>   - Concern: Up to 43.8 hours of downtime per year, risking operational disruptions.<br/>   - Proposed Change: 99.99% uptime with tiered service credits (10% for <99.99%, 25% for <99.9%).<br/><br/>3. Liability (Section 9):<br/>   - Current: Cap at 3 months of fees.<br/>   - Concern: Grossly inadequate for data breaches or prolonged outages.<br/>   - Proposed Change: 12 months' fees for general liability. Uncapped for data breaches and willful misconduct.<br/><br/>These changes are non-negotiable. They align with industry standards and our commitment to data security and operational excellence. We value the potential partnership and believe addressing these will set a strong foundation.<br/><br/>Please have your legal team review and incorporate these changes.<br/><br/>Best regards,<br/>{{CLO_NAME}} |

---

# Long Context Prompting Tips

**Note:** While these tips apply broadly to all Claude models, you can find prompting tips specific to extended thinking models [here](/docs/en/build-with-claude/prompt-engineering/extended-thinking-tips).

Claude's extended context window enables handling complex, data-rich tasks. This guide will help you leverage this power effectively.

## Essential Tips for Long Context Prompts

- **Put longform data at the top**: Place your long documents and inputs (~20K+ tokens) near the top of your prompt, above your query, instructions, and examples. This can significantly improve Claude's performance across all models.

  **Note:** Queries at the end can improve response quality by up to 30% in tests, especially with complex, multi-document inputs.

- **Structure document content and metadata with XML tags**: When using multiple documents, wrap each document in `<document>` tags with `<document_content>` and `<source>` (and other metadata) subtags for clarity.

**Example: Multi-document structure:**

```xml
<documents>
  <document index="1">
    <source>annual_report_2023.pdf</source>
    <document_content>
      {{ANNUAL_REPORT}}
    </document_content>
  </document>
  <document index="2">
    <source>competitor_analysis_q2.xlsx</source>
    <document_content>
      {{COMPETITOR_ANALYSIS}}
    </document_content>
  </document>
</documents>

Analyze the annual report and competitor analysis. Identify strategic advantages and recommend Q3 focus areas.
```

- **Ground responses in quotes**: For long document tasks, ask Claude to quote relevant parts of the documents first before carrying out its task. This helps Claude cut through the "noise" of the rest of the document's contents.

**Example: Quote extraction:**

```xml
You are an AI physician's assistant. Your task is to help doctors diagnose possible patient illnesses.

<documents>
  <document index="1">
    <source>patient_symptoms.txt</source>
    <document_content>
      {{PATIENT_SYMPTOMS}}
    </document_content>
  </document>
  <document index="2">
    <source>patient_records.txt</source>
    <document_content>
      {{PATIENT_RECORDS}}
    </document_content>
  </document>
  <document index="3">
    <source>patient01_appt_history.txt</source>
    <document_content>
      {{PATIENT01_APPOINTMENT_HISTORY}}
    </document_content>
  </document>
</documents>

Find quotes from the patient records and appointment history that are relevant to diagnosing the patient's reported symptoms. Place these in <quotes> tags. Then, based on these quotes, list all information that would help the doctor diagnose the patient's symptoms. Place your diagnostic information in <info> tags.
```

---

## Additional Resources

- **[Prompt Library](/docs/en/resources/prompt-library/library)**: Get inspired by a curated selection of prompts for various tasks and use cases.
- **[GitHub Prompting Tutorial](https://github.com/anthropics/prompt-eng-interactive-tutorial)**: An example-filled tutorial that covers the prompt engineering concepts found in our docs.
- **[Google Sheets Prompting Tutorial](https://docs.google.com/spreadsheets/d/19jzLgRruG9kjUQNKtCg1ZjdD6l6weA6qRXG5zLIAhC8)**: A lighter weight version of our prompt engineering tutorial via an interactive spreadsheet.
