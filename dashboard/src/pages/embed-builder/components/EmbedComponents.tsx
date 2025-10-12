import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';

interface LinkButton {
    label: string;
    url: string;
    emoji?: string;
}

interface ComponentProps {
    embed: any;
    handleChange: (path: string, value: string) => void;
    onRemove: () => void;
}

export const TitleComponent: React.FC<ComponentProps> = ({ embed, handleChange, onRemove }) => (
    <div className="bg-secondary rounded-xl p-4 border border-border relative group hover:border-primary/50 transition-all duration-200">
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
                onClick={onRemove}
                className="text-destructive hover:text-destructive/80 transition-colors p-1 hover:bg-destructive/10 rounded"
            >
                <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
            </button>
        </div>
        <h3 className="text-sm font-medium text-foreground mb-2">Title</h3>
        <input
            type="text"
            value={embed.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
            placeholder="Enter title"
        />
    </div>
);

export const DescriptionComponent: React.FC<ComponentProps> = ({ embed, handleChange, onRemove }) => (
    <div className="bg-secondary rounded-xl p-4 border border-border relative group hover:border-primary/50 transition-all duration-200">
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
                onClick={onRemove}
                className="text-destructive hover:text-destructive/80 transition-colors p-1 hover:bg-destructive/10 rounded"
            >
                <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
            </button>
        </div>
        <h3 className="text-sm font-medium text-foreground mb-2">Description</h3>
        <textarea
            value={embed.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 h-48 resize-y whitespace-pre-wrap"
            placeholder="Enter description"
            style={{ minHeight: '8rem' }}
        />
    </div>
);

export const ColorComponent: React.FC<ComponentProps> = ({ embed, handleChange, onRemove }) => (
    <div className="bg-secondary rounded-xl p-4 border border-border relative group hover:border-primary/50 transition-all duration-200">
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
                onClick={onRemove}
                className="text-destructive hover:text-destructive/80 transition-colors p-1 hover:bg-destructive/10 rounded"
            >
                <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
            </button>
        </div>
        <h3 className="text-sm font-medium text-foreground mb-2">Color</h3>
        <input
            type="color"
            value={embed.color}
            onChange={(e) => handleChange('color', e.target.value)}
            className="w-full h-10 bg-background border border-border rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
        />
    </div>
);

export const AuthorComponent: React.FC<ComponentProps> = ({ embed, handleChange, onRemove }) => (
    <div className="bg-secondary rounded-xl p-4 border border-border relative group hover:border-primary/50 transition-all duration-200">
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
                onClick={onRemove}
                className="text-destructive hover:text-destructive/80 transition-colors p-1 hover:bg-destructive/10 rounded"
            >
                <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
            </button>
        </div>
        <h3 className="text-sm font-medium text-foreground mb-2">Author</h3>
        <div className="space-y-4">
            <input
                type="text"
                value={embed.author.name}
                onChange={(e) => handleChange('author.name', e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                placeholder="Author name"
            />
            <input
                type="text"
                value={embed.author.icon_url}
                onChange={(e) => handleChange('author.icon_url', e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                placeholder="Author icon URL"
            />
        </div>
    </div>
);

interface FieldsComponentProps extends ComponentProps {
    addField: () => void;
    removeField: (index: number) => void;
    handleFieldChange: (index: number, key: keyof EmbedField, value: string | boolean) => void;
}

interface EmbedField {
    name: string;
    value: string;
    inline: boolean;
}

export const FieldsComponent: React.FC<FieldsComponentProps> = ({ 
    embed, 
    addField, 
    removeField, 
    handleFieldChange,
    onRemove 
}) => (
    <div className="bg-secondary rounded-xl p-4 border border-border relative group hover:border-primary/50 transition-all duration-200">
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
                onClick={onRemove}
                className="text-destructive hover:text-destructive/80 transition-colors p-1 hover:bg-destructive/10 rounded"
            >
                <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
            </button>
        </div>
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground">Fields</h3>
            <button
                onClick={addField}
                className="flex items-center space-x-2 px-3 py-1 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
            >
                <span>Add Field</span>
            </button>
        </div>
        <div className="space-y-4">
            {embed.fields.map((field: any, index: number) => (
                <div key={index} className="bg-background rounded-lg p-4 space-y-3 group/field">
                    <div className="flex justify-between items-center">
                        <h4 className="text-sm font-medium text-foreground">Field {index + 1}</h4>
                        <button
                            onClick={() => removeField(index)}
                            className="text-destructive hover:text-destructive/80 transition-colors p-1 hover:bg-destructive/10 rounded opacity-0 group-hover/field:opacity-100"
                        >
                            <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                        </button>
                    </div>
                    <input
                        type="text"
                        value={field.name}
                        onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                        placeholder="Field name"
                    />
                    <textarea
                        value={field.value}
                        onChange={(e) => handleFieldChange(index, 'value', e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 h-20 resize-none"
                        placeholder="Field value"
                    />
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={field.inline}
                            onChange={(e) => handleFieldChange(index, 'inline', e.target.checked)}
                            className="rounded bg-background border-border text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-foreground">Inline</span>
                    </label>
                </div>
            ))}
        </div>
    </div>
);

export const FooterComponent: React.FC<ComponentProps> = ({ embed, handleChange, onRemove }) => (
    <div className="bg-secondary rounded-xl p-4 border border-border relative group hover:border-primary/50 transition-all duration-200">
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
                onClick={onRemove}
                className="text-destructive hover:text-destructive/80 transition-colors p-1 hover:bg-destructive/10 rounded"
            >
                <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
            </button>
        </div>
        <h3 className="text-sm font-medium text-foreground mb-2">Footer</h3>
        <div className="space-y-4">
            <input
                type="text"
                value={embed.footer.text}
                onChange={(e) => handleChange('footer.text', e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                placeholder="Footer text"
            />
            <input
                type="text"
                value={embed.footer.icon_url}
                onChange={(e) => handleChange('footer.icon_url', e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                placeholder="Footer icon URL"
            />
        </div>
    </div>
);

export const ImageComponent: React.FC<ComponentProps> = ({ embed, handleChange, onRemove }) => (
    <div className="bg-secondary rounded-xl p-4 border border-border relative group hover:border-primary/50 transition-all duration-200">
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
                onClick={onRemove}
                className="text-destructive hover:text-destructive/80 transition-colors p-1 hover:bg-destructive/10 rounded"
            >
                <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
            </button>
        </div>
        <h3 className="text-sm font-medium text-foreground mb-2">Image</h3>
        <input
            type="text"
            value={embed.image}
            onChange={(e) => handleChange('image', e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
            placeholder="Image URL"
        />
    </div>
);

export const ThumbnailComponent: React.FC<ComponentProps> = ({ embed, handleChange, onRemove }) => (
    <div className="bg-secondary rounded-xl p-4 border border-border relative group hover:border-primary/50 transition-all duration-200">
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
                onClick={onRemove}
                className="text-destructive hover:text-destructive/80 transition-colors p-1 hover:bg-destructive/10 rounded"
            >
                <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
            </button>
        </div>
        <h3 className="text-sm font-medium text-foreground mb-2">Thumbnail</h3>
        <input
            type="text"
            value={embed.thumbnail}
            onChange={(e) => handleChange('thumbnail', e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
            placeholder="Thumbnail URL"
        />
    </div>
);

interface LinkButtonsComponentProps extends ComponentProps {
    addLinkButton: () => void;
    removeLinkButton: (index: number) => void;
    handleLinkButtonChange: (index: number, field: string, value: string) => void;
}

export const LinkButtonsComponent: React.FC<LinkButtonsComponentProps> = ({ 
    embed, 
    onRemove, 
    addLinkButton, 
    removeLinkButton,
    handleLinkButtonChange 
}) => (
    <div className="bg-secondary rounded-xl p-4 border border-border relative group hover:border-primary/50 transition-all duration-200">
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
                onClick={onRemove}
                className="text-destructive hover:text-destructive/80 transition-colors p-1 hover:bg-destructive/10 rounded"
            >
                <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
            </button>
        </div>
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground">Link Buttons</h3>
            <button
                onClick={addLinkButton}
                className="flex items-center space-x-2 px-3 py-1 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors text-sm"
            >
                <FontAwesomeIcon icon={faPlus} className="w-3 h-3" />
                <span>Add Button</span>
            </button>
        </div>
        <div className="space-y-4">
            {embed.linkButtons.map((button: LinkButton, index: number) => (
                <div key={index} className="relative group/button bg-background rounded-lg p-4 border border-border">
                    <div className="absolute top-2 right-2 opacity-0 group-hover/button:opacity-100 transition-opacity">
                        <button
                            onClick={() => removeLinkButton(index)}
                            className="text-destructive hover:text-destructive/80 transition-colors p-1 hover:bg-destructive/10 rounded"
                        >
                            <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="space-y-3">
                        <input
                            type="text"
                            value={button.label}
                            onChange={(e) => handleLinkButtonChange(index, 'label', e.target.value)}
                            className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                            placeholder="Button Label"
                        />
                        <input
                            type="text"
                            value={button.url}
                            onChange={(e) => handleLinkButtonChange(index, 'url', e.target.value)}
                            className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                            placeholder="Button URL"
                        />
                        <input
                            type="text"
                            value={button.emoji || ''}
                            onChange={(e) => handleLinkButtonChange(index, 'emoji', e.target.value)}
                            className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                            placeholder="Button Emoji (optional)"
                        />
                    </div>
                </div>
            ))}
        </div>
    </div>
); 