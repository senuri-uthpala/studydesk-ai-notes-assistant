def search_in_text(content: str, question: str) -> str:
    """
    content එකේ question එකේ keywords තියෙන 
    paragraph/lines හොයාගෙන return කරනවා
    """
    # Question එකෙන් වැදගත් words ටික ගන්නවා (simple keyword split)
    keywords = [word.lower() for word in question.split() if len(word) > 2]
    
    # Content එක lines වලට කඩනවා
    lines = content.split("\n")
    
    matching_lines = []
    
    for i, line in enumerate(lines):
        line_lower = line.lower()
        # මේ line එකේ keyword එකක් හරි තියෙනවද කියලා check කරනවා
        if any(keyword in line_lower for keyword in keywords):
            # Match වුනොත්, ඒ line එකට ලං context එකත් එකතු කරගන්නවා
            start = max(0, i - 1)
            end = min(len(lines), i + 3)
            context = "\n".join(lines[start:end])
            matching_lines.append(context)
    
    if not matching_lines:
        return "සමාවෙන්න, ඔයාගේ notes එකේ මේ ප්‍රශ්නෙට උත්තරයක් හොයාගන්න බැරි උනා."
    
    # Duplicate නොවෙන විදිහට, first 3 matches විතරක් return කරනවා
    unique_matches = list(dict.fromkeys(matching_lines))
    return "\n\n---\n\n".join(unique_matches[:3])